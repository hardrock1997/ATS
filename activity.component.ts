import { Component, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// Material
import { MatPaginator, MatSort, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
// RXJS
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { fromEvent, merge } from 'rxjs';
// Services
import { ActivityService } from './_core/services/index';
import { LayoutUtilsService, MessageType } from '../../_shared/utils/layout-utils.service';
import { SubheaderService } from '../../../../core/services/layout/subheader.service';
import { ProjectService } from '../projects/_core/services/index';
import { CategoryService } from './../categories/_core/services/category.service';
//User Access Role Service
import { UserAccessRolesService } from '../../../../config/user-access-roles.service';
// Models
import { ActivityModel } from './_core/models/activity.model';
import { ActivityDataSource } from './_core/models/data-sources/activity.datasource';
import { QueryParamsModel } from '../../_shared/_core/models/query-models/query-params.model';
import {Location} from '@angular/common';
import { CandidateModel } from '../candidate/_core/models/candidate.model';
import { CategoryDataSource } from '../categories/_core/models/data-sources/category.datasource';
@Component({
	selector: 'm-activity',
	templateUrl: './activity.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityComponent implements OnInit {
	// Table fields
	dataSource: ActivityDataSource;
	datasourcep:CategoryDataSource;
	displayedColumns = ['project_id','createdAt', 'created_by.first_name', 'requisition.req_code','projectProfile.title', 'type.description', 'type.id','notes'];
	@ViewChild(MatPaginator) paginator: MatPaginator;
	@ViewChild(MatSort) sort: MatSort;
	// Filter fields
	@ViewChild('searchInput') searchInput: ElementRef;
	filterStatus: string = '';
	filterCondition: string = '';
	filterProjects: string = '';
	projectName: String = null;
	projects: Array<any>=[];
	// Selection
	selection = new SelectionModel<ActivityModel>(true, []);
	activityResult: ActivityModel[] = [];
	candidateModel = new CandidateModel();

	constructor(private activityService: ActivityService,
		public dialog: MatDialog,
		private route: ActivatedRoute,
		private projectService: ProjectService,
		private categoryService:CategoryService,
		private subheaderService: SubheaderService,
		private layoutUtilsService: LayoutUtilsService,
		private _location: Location,
		public accessRoles: UserAccessRolesService) { 

		if(!this.accessRoles.canViewActicityList()){
			this.goBack();
		}
	}

	/** LOAD DATA */
	ngOnInit() {
		// If the user changes the sort order, reset back to the first page.
		this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));

		/* Data load will be triggered in two cases:
		- when a pagination event occurs => this.paginator.page
		- when a sort event occurs => this.sort.sortChange
		**/
		merge(this.sort.sortChange, this.paginator.page)
			.pipe(
				tap(() => {
					this.loadActivityList();
				})
			)
			.subscribe();

		// Filtration, bind to searchInput
		fromEvent(this.searchInput.nativeElement, 'keyup')
			.pipe(
				debounceTime(150),
				distinctUntilChanged(),
				tap(() => {
					this.paginator.pageIndex = 0;
					this.loadActivityList();
				})
			)
			.subscribe();

		// Set title to page breadCrumbs
		this.subheaderService.setTitle('Activities');
		this.subheaderService.setBreadcrumbs(null);
		// Init DataSource
		this.dataSource = new ActivityDataSource(this.activityService);
		let queryParams = new QueryParamsModel({});
		this.dataSource.loadActivities(queryParams);
		this.datasourcep = new CategoryDataSource(this.categoryService);
		let queryParamsp = new QueryParamsModel({});
		this.datasourcep.loadCategories(queryParamsp);		
		this.dataSource.entitySubject.subscribe(res => {
			this.activityResult = res;		
		});
		this.projects=JSON.parse(localStorage.getItem("userProjects")); //Using local storage for getting user,s projects.
        this.filterProjects = this.projects.length > 0 ? (this.projects[0].project_id).toString():'';
	}

	loadActivityList() {		
		this.selection.clear();
		const queryParams = new QueryParamsModel(
			this.filterConfiguration(),
			this.sort.direction,
			this.sort.active,
			this.paginator.pageIndex,
			this.paginator.pageSize
		);
		this.dataSource.loadActivities(queryParams);

	}
	loadCategoryList() {
		const queryParamsp = new QueryParamsModel(
			
			this.filterConfigurationp(),
			this.sort.direction,
			this.sort.active,
			this.paginator.pageIndex,
			this.paginator.pageSize
		);
		this.datasourcep.loadCategories(queryParamsp);
	}


	getProjectName(projectId): String {
		let project = this.projects.find(function(proj) {
		  return proj.project_id ==  projectId;
		  
		});
		if(project){
			return project.name;
	}
	}


	/** FILTRATION */

	filterConfigurationp(): any {
		const filter: any = {
			'fileds':[],
			'term_query': null,
			'term_fields': null,
		};
		if (this.filterProjects && this.filterProjects.length > 0) {
			filter.fileds.push({'fieldName':'project_id', 'fieldValue':this.filterProjects});
			this.projectName = this.getProjectName(this.filterProjects);
		}
		return filter;
	}




	filterConfiguration(): any {
		const filter: any = {
			'fileds':[],
			'term_query': null,
			'term_fields': null,
		};
		const searchText: string = this.searchInput.nativeElement.value;

		/*if (this.filterStatus && this.filterStatus.length > 0) {
			filter.fileds.push({'fieldName':'filter.status', 'fieldValue':this.filterStatus});
		}

		if (this.filterCondition.length > 0) {
			filter.fileds.push({'fieldName':'filter.active', 'fieldValue':this.filterCondition == 'true'?1:0});
		}*/

		if(searchText){
			filter.term_query  = searchText;
			filter.term_fields = 'notes';
		}
		return filter;
	}
	/** Fetch */
	fetchActivities() {
		let messages = [];
		this.selection.selected.forEach(elem => {
			messages.push({
				text: `${elem.req_id}, ${elem.activity}`,
				id: elem.req_id,
				status: elem.status
			});
		});
		this.layoutUtilsService.fetchElements(messages);
	}

	/* UI */
	getItemStatusString(status: string = 'Pending'): string {
		/*switch (status) {
			case 'Pending':
				return 'Pending';
			case 1:
				return 'Sold';
		}
		return '';*/
		return status;
	}

	getItemCssClassByStatus(status: string = 'Pending'): string {		
		switch (status) {
			case 'Pending':
				return 'orange';
			case 'Approved':
				return 'primary';
			case 'Save':
				return 'orange';
		}
		return '';
	}

	getItemConditionString(condition: string = 'Pending'): string {
		/*switch (condition) {
			case 0:
				return '';
			case 1:
				return '';
		}*/
		return condition;
	}

	getItemCssClassByCondition(condition: string = 'Pending'): string {
		switch (condition) {
			case 'Pending':
				return 'orange';
			case 'Save':
				return 'orange';
			case 'Approved':
				return 'primary';
		}
		return '';
	}

	goBack(id = 0) {
		this.subheaderService.setBreadcrumbs(null);
		this._location.back();
	}

	getCanItemStatusString(status: number = 1): string {
		return this.candidateModel.getItemStatusString(status);
	}

	getCanActivityStatusString(status: number = 1): string {
		return this.candidateModel.getActivityStatusString(status);
	}

}
