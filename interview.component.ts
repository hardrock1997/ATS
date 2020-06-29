import { Component, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy,ChangeDetectorRef } from '@angular/core';
// Material
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator, MatSort, MatSnackBar, MatDialog } from '@angular/material';
// RXJS
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { fromEvent, merge, forkJoin } from 'rxjs';
// Services
import { InterviewService } from './_core/services/index';
import { CategoryService } from './../categories/_core/services/category.service';
import { LayoutUtilsService, MessageType } from '../../_shared/utils/layout-utils.service';
import { HttpUtilsService } from '../../_shared/_core/utils/http-utils.service';
//User Access Role Service
import { UserAccessRolesService } from '../../../../config/user-access-roles.service';
// Models
import { QueryParamsModel } from '../../_shared/_core/models/query-models/query-params.model';
import { CategoryDataSource } from '../categories/_core/models/data-sources/category.datasource';
import { InterviewModel } from './_core/models/interview.model';
import { InterviewDataSource } from './_core/models/data-sources/interview.datasource';
// Components
import { FeedbackAddDialogComponent } from './feedback-add/feedback-add.dialog.component';
import { SubheaderService } from '../../../../core/services/layout/subheader.service';
import {Location} from '@angular/common';
import { ProjectService } from '../projects/_core/services/index';
@Component({
	selector: 'm-interview',
	templateUrl: './interview.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewComponent implements OnInit {
	datasourcep:CategoryDataSource;
	dataSource: InterviewDataSource;
	displayedColumns = ['project_id','requisition.req_code', 'requisition.projectProfile.title', 'candidate.first_name', 'candidate.last_name', 'interviewer.first_name', 'from', 'status', 'actions'];
	@ViewChild(MatPaginator) paginator: MatPaginator;
	@ViewChild(MatSort) sort: MatSort;
	// Filter fields
	@ViewChild('searchInput') searchInput: ElementRef;
	filterStatus: string = '';
	filterType: string = '';
	filterProjects: string = '';
	projectName: String = null;
	projects: Array<any>=[];
	// Selection
	selection = new SelectionModel<InterviewModel>(true, []);
	InterviewResult: InterviewModel[] = [];
	constructor(
		private InterviewService: InterviewService,
		private subheaderService: SubheaderService,
		private cdr: ChangeDetectorRef,
		private projectService: ProjectService,
		private categoryService:CategoryService,
		public dialog: MatDialog,
		public snackBar: MatSnackBar,
		private layoutUtilsService: LayoutUtilsService,
		public accessRoles: UserAccessRolesService,
		private _location: Location,
	) {
		if(!this.accessRoles.canViewInterviewList()){
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
					this.loadInterviewList();
				})
			)
			.subscribe();

		// Filtration, bind to searchInput
		/*fromEvent(this.searchInput.nativeElement, 'keyup')
			.pipe(
				// tslint:disable-next-line:max-line-length
				debounceTime(150), // The user can type quite quickly in the input box, and that could trigger a lot of server requests. With this operator, we are limiting the amount of server requests emitted to a maximum of one every 150ms
				distinctUntilChanged(), // This operator will eliminate duplicate values
				tap(() => {
					this.paginator.pageIndex = 0;
					this.loadInterviewList();
				})
			)
			.subscribe();*/
		this.subheaderService.setTitle('interviews');
		this.subheaderService.setBreadcrumbs(null);
		// Init DataSource
		const queryParams = new QueryParamsModel(this.filterConfiguration(false));
		this.dataSource = new InterviewDataSource(this.InterviewService);
		this.datasourcep = new CategoryDataSource(this.categoryService);
		let queryParamsp = new QueryParamsModel({});
		this.datasourcep.loadCategories(queryParamsp);
		// First load
		this.dataSource.loadInterview(queryParams);
		this.dataSource.entitySubject.subscribe(res => (this.InterviewResult = res));

        this.projects=JSON.parse(localStorage.getItem("userProjects")); //Using local storage for getting user,s projects.
        this.filterProjects = this.projects.length > 0 ? (this.projects[0].project_id).toString():'';
	}

	loadInterviewList() {
		this.selection.clear();
		const queryParams = new QueryParamsModel(
			this.filterConfiguration(true),
			this.sort.direction,
			this.sort.active,
			this.paginator.pageIndex,
			this.paginator.pageSize
		);		
		this.dataSource.loadInterview(queryParams);
		this.selection.clear();
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

	getProjectName(projectId): String {
		let project = this.projects.find(function(proj) {
		  return proj.project_id ==  projectId;
		  
		});
		if(project){
			return project.name;
	}
	}

	/** FILTRATION */
	filterConfiguration(isGeneralSearch: boolean = true): any {
		const filter: any = {
			'fileds':[],
			'term_query': null,
			'term_fields': null,
		};
		//const searchText: string = this.searchInput.nativeElement.value;		
		if (this.filterStatus) {
			//console.log(this.filterStatus);
			filter.fileds.push({'fieldName':'filter.status', 'fieldValue':this.filterStatus});
		}
		/*if(searchText){
			filter.term_query  = searchText;
			filter.term_fields = 'from';
		}*/
		/*filter.lastName = searchText;
		if (!isGeneralSearch) {
			return filter;
		}*/
		/*filter.req_id = searchText;
		filter.jobtitle = searchText;
		filter.first_name = searchText;
		filter.last_name = searchText;
		filter.interviewer = searchText;*/
		/*filter.from = searchText;*/
		return filter;
	}

	addFeedback(candidate: any) {		
		this.feedbackCandidate(candidate);
	}

	/** Edit */
	feedbackCandidate(candidate: any) {
		let saveMessageTranslateParam = 'Add feedback';
		const _saveMessage = 'Feeddback successfully has been added.'
		const _messageType = candidate.id > 0 ? MessageType.Update : MessageType.Create;
		const dialogRef = this.dialog.open(FeedbackAddDialogComponent, { data: { candidate } });
		dialogRef.afterClosed().subscribe(res => {
			if (!res) {
				return;
			}
			this.layoutUtilsService.showActionNotification(_saveMessage, _messageType, 10000, true, false);
			//this.loadInterviewList();
		});
	}

	/** ACTIONS */
	/** Delete */
	deleteInterview(id: number) {
		const _title: string = 'Interview Delete';
		const _description: string = 'Are you sure to permanently delete this interview?';
		const _waitDesciption: string = 'Interview is deleting...';
		const _deleteMessage = `Interview has been deleted`;

		const dialogRef = this.layoutUtilsService.deleteElement(_title, _description, _waitDesciption);
		dialogRef.afterClosed().subscribe(res => {
			if (!res) {
				return;
			}

			this.InterviewService.deleteInterview(id).subscribe(() => {
				this.layoutUtilsService.showActionNotification(_deleteMessage, MessageType.Delete);
				this.loadInterviewList();
			});
		});
	}

	/** UI */
	getItemCssClassByStatus(status: string = 'Pending'): string {
		switch (status) {
			case 'Pending':
				return 'orange';
			case 'Complete':
				return 'primary';
			case 'Cancelled':
				return 'danger';
		}
		return '';
	}

	goBack(){
		this._location.back();
	}
	
}
