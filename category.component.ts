import { Component, OnInit, ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// Material
import { MatPaginator, MatSort, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
// RXJS
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { fromEvent, merge } from 'rxjs';
// Services
import { CategoryService } from './_core/services/index';
import { LayoutUtilsService, MessageType } from '../../_shared/utils/layout-utils.service';
import { SubheaderService } from '../../../../core/services/layout/subheader.service';
//Project Services
import { ProjectService } from '../projects/_core/services/index';
//User Access Role Service
import { UserAccessRolesService } from '../../../../config/user-access-roles.service';
// Models
import { CategoryDataSource } from './_core/models/data-sources/category.datasource';
import { QueryParamsModel } from '../../_shared/_core/models/query-models/query-params.model';
import {Location} from '@angular/common';

@Component({
	selector: 'm-category',
	templateUrl: './category.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryComponent implements OnInit {
	// Table fields
	dataSource: CategoryDataSource;
	displayedColumns = ['project_id','name', 'title', 'description'];
	@ViewChild(MatPaginator) paginator: MatPaginator;
	@ViewChild(MatSort) sort: MatSort;
	//  fields
	@ViewChild('searchInput') searchInput: ElementRef;

	filterProjects: string = '';
	projects: Array<any> = [];
	projectName: String = null;

	constructor(private categoryService: CategoryService,
		public dialog: MatDialog,
		private route: ActivatedRoute,
		private subheaderService: SubheaderService,
		private projectService: ProjectService,
		private cdr: ChangeDetectorRef,
		private _location: Location,
		public accessRoles: UserAccessRolesService,
		private layoutUtilsService: LayoutUtilsService) { 
			if(!this.accessRoles.canViewProjectCategoryList()){
				this.goBack();
			}
	}
//console.log(currentUser.'userDetails')
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
					this.loadCategoryList();
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
					this.loadCategoryList();
				})
			)
			.subscribe();

		// Set title to page breadCrumbs
		this.subheaderService.setTitle('Job Title');
		this.subheaderService.setBreadcrumbs(null);
		// Init DataSource
		this.dataSource = new CategoryDataSource(this.categoryService);
		let queryParams = new QueryParamsModel({});
		this.dataSource.loadCategories(queryParams);
		this.getProjects();
	}

	loadCategoryList() {
		const queryParams = new QueryParamsModel(
			
			this.filterConfiguration(),
			this.sort.direction,
			this.sort.active,
			this.paginator.pageIndex,
			this.paginator.pageSize
		);
		this.dataSource.loadCategories(queryParams);
	}

	/** FILTRATION */
	filterConfiguration(): any {
		const filter: any = {
			'fileds':[],
			'term_query': null,
			'term_fields': null,
		};
		const searchText: string = this.searchInput.nativeElement.value;
		if (this.filterProjects && this.filterProjects.length > 0) {
			filter.fileds.push({'fieldName':'project_id', 'fieldValue':this.filterProjects});
			this.projectName = this.getProjectName(this.filterProjects);
		}
		if(searchText){
			filter.term_query  = searchText;
			filter.term_fields = 'name,projectProfiles.title,projectProfiles.description';
		}
		return filter;
	}

	getProjects(){
		this.projectService.getAllProjects().subscribe(res => {	
			let p: Array<any>=JSON.parse(localStorage.getItem("userProjects"));//using local storage to get user,s projects
			this.projects=p;
			this.projectName = this.projects.length > 0 ? this.projects[0].name:'';
			this.filterProjects = this.projects.length > 0 ? (this.projects[0].project_id).toString():'';
			this.loadCategoryList();
			this.cdr.detectChanges();
		},error=>{});
	}

	getProjectName(projectId): String {
		var project = this.projects.find(function(proj) {
		  return proj.project_id ==  projectId;
		  
		});
		if(project){
			return project.name;
	}
	}

	goBack() {
		this.subheaderService.setBreadcrumbs(null);
		this._location.back();
	}
	

}
