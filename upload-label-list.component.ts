import { Component, OnInit, ElementRef, ViewChild, Input, ChangeDetectionStrategy } from '@angular/core';
import { Validators, FormBuilder, FormGroup, AbstractControl } from '@angular/forms';
// Material
import { MatPaginator, MatSort, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
// RXJS
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { fromEvent, merge, BehaviorSubject } from 'rxjs';
// Services
import { TypesUtilsService } from '../../../../_shared/_core/utils/types-utils.service';
import { LayoutUtilsService, MessageType } from '../../../../_shared/utils/layout-utils.service';
import { ProjectUploadLabelService } from '../../_core/services/index';
//User Access Role Service
import { UserAccessRolesService } from '../../../../../../config/user-access-roles.service';
// Models
import { ProjectUploadLabelModel} from '../../_core/models/project-upload-label.model';
import { ProjectUploadLabelDataSource } from '../../_core/models/data-sources/project-upload-label.datasource';
import { QueryParamsModel } from '../../../../_shared/_core/models/query-models/query-params.model';
import { ListStateModel, StateActions } from '../../../../_shared/_core/utils/list-state.model';
//Constant
import { 
	candSubmitted,
	candQualifying,
	candDisqualified,
	candInterviewRequested,
	candInterviewScheduled,
	candInterviewFeedback,
	candRejected,
	candHireRequested,
	candHireApproved,
	candHireRejected,
	candOnboarding, 
	candOnboarded,
	candWithdrawn, 
	candDeclined,candidateActivityLists} from '../../../../../../config/constants';

// Components
@Component({
	selector: 'm-upload-label-list',
	templateUrl: './upload-label-list.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadLabelListComponent implements OnInit {
	// Incoming data
	@Input() loadingSubject = new BehaviorSubject<boolean>(false);
	@Input() activityMessageListState: ListStateModel;	
	activityList: Array<any> = [];
	activityListForUploadLabel: Array<any>;
	filterActivity: String = '';
	// Table fields
	dataSource: ProjectUploadLabelDataSource;
	displayedColumns = ['activity.name', 'message','required','actions'];
	@ViewChild(MatPaginator) paginator: MatPaginator;
	@ViewChild(MatSort) sort: MatSort;
	// Filter fields
	@ViewChild('searchInput') searchInput: ElementRef;
	// Selection
	selection = new SelectionModel<ProjectUploadLabelModel>(true, []);
	projectActivityMessagesResult: ProjectUploadLabelModel[] = [];
	// Add and Edit
	isSwitchedToEditMode: boolean = false;
	loadingAfterSubmit: boolean = false;
	formGroup: FormGroup;
	activityMessageForEdit: ProjectUploadLabelModel;
	activityMessageForAdd: ProjectUploadLabelModel;	

	constructor(private projectUploadLabelService: ProjectUploadLabelService,
		private fb: FormBuilder,
		public dialog: MatDialog,
		public typesUtilsService: TypesUtilsService,
		public accessRoles: UserAccessRolesService,
		private layoutUtilsService: LayoutUtilsService) { }

	ngOnInit() {
		// get all candidate List
		this.getCandidateStatus();

		// If the user changes the sort order, reset back to the first page.
		this.sort.sortChange.subscribe(() => (this.paginator.pageIndex = 0));
		/* Data load will be triggered in two cases:
		- when a pagination event occurs => this.paginator.page
		- when a sort event occurs => this.sort.sortChange
		**/
		merge(this.sort.sortChange, this.paginator.page)
			.pipe(
				tap(() => {
					this.loadUploadLabelsList();
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
					this.loadUploadLabelsList();
				})
			)
			.subscribe();

		// Init DataSource
		this.dataSource = new ProjectUploadLabelDataSource(this.projectUploadLabelService);
		// this loading binded to parent component loading
		this.dataSource.loading$.subscribe(res => {
			this.loadingSubject.next(res);
		});
		this.loadUploadLabelsList(true);
		this.dataSource.entitySubject.subscribe(res =>{
			console.log('ngonit',res);
			const selectedIds=res.map(x=> x.status_id);
			if(selectedIds)
			this.activityListForUploadLabel=this.activityList.filter(x=>  !selectedIds.includes(x.id));
			this.projectActivityMessagesResult = res;
		});
		this.createFormGroup();
	}

	//Display Upload label list to DataTable
	loadUploadLabelsList(_isFirstLoading: boolean = false) {
		this.selection.clear();
		let queryParams = new QueryParamsModel(
			this.filterConfiguration(),
			this.sort.direction,
			this.sort.active,
			this.paginator.pageIndex,
			this.paginator.pageSize
		);
		if (_isFirstLoading) {
			queryParams = new QueryParamsModel(this.filterConfiguration(), 'desc', 'id', 0, 10);
		}
		this.dataSource.loadUploadLabels(queryParams, this.activityMessageListState);
	}

	// Add+Edit forms | FormGroup
	createFormGroup(_item = null) {
		// 'edit' prefix - for item editing
		// 'add' prefix - for item creation
		this.formGroup = this.fb.group({
			editActivity: ['', [Validators.required,Validators.maxLength(200)]],
			editText: ['', [Validators.required,Validators.minLength(2), Validators.maxLength(200),this.noWhitespaceValidator]],
			newActivity: ['', Validators.required],
			newText: ['', [Validators.required,Validators.maxLength(200)]],
			editRequired: [false],
			newRequired: [false],
			id: [''],
		});
		this.clearAddForm();
		this.clearEditForm();
	}
	//Remove extra whitespaces from form control.
	noWhitespaceValidator(control: AbstractControl) {
	  if (control && control.value && !control.value.replace(/\s/g, '').length) {
	    control.setValue('');
	  }
	  return null;
	}

	// ADD REMARK FUNCTIONS: clearAddForm | checkAddForm | addActivityMessageButtonOnClick | cancelAddButtonOnClick | saveNewActivityMessage
	clearAddForm() {
		const controls = this.formGroup.controls;
		controls['newActivity'].setValue('');
		controls['newActivity'].markAsPristine();
		controls['newActivity'].markAsUntouched();
		controls['newText'].setValue('');
		controls['newText'].markAsPristine();
		controls['newText'].markAsUntouched();
		controls['newRequired'].setValue(false);
		controls['newRequired'].markAsPristine();
		controls['newRequired'].markAsUntouched();
		this.activityMessageForAdd = new ProjectUploadLabelModel();
		this.activityMessageForAdd.clear();		
		this.activityMessageForAdd._isEditMode = false;
	}

	checkAddForm() {
		const controls = this.formGroup.controls;
		if (controls['newActivity'].invalid || controls['newText'].invalid || controls['newRequired'].invalid) {
			controls['newActivity'].markAsTouched();
			controls['newText'].markAsTouched();
			controls['newRequired'].markAsTouched();
			return false;
		}
		return true;
	}

	addActivityMessageButtonOnClick() {
		this.clearAddForm();
		this.activityMessageForAdd._isEditMode = true;
		this.isSwitchedToEditMode = true;
	}

	cancelAddButtonOnClick() {
		this.activityMessageForAdd._isEditMode = false;
		this.isSwitchedToEditMode = false;
	}

	saveNewActivityMessage() {
		if (!this.checkAddForm()) {
			return;
		}
		this.loadingAfterSubmit = true;
		const controls = this.formGroup.controls;		
		var _activityMessage = {};
		_activityMessage = {
			"status_id": controls['newActivity'].value,
			"text": controls['newText'].value,
			"projectId": this.activityMessageListState.entityId,
			"is_required": controls['newRequired'].value,
		}
		this.projectUploadLabelService.createUploadLabel(_activityMessage).subscribe(res => {
			this.loadingAfterSubmit = false;
			this.activityMessageForAdd._isEditMode = false;
			this.activityMessageListState.setItem(this.activityMessageForAdd, StateActions.CREATE);
			this.loadUploadLabelsList();
			const _saveMessage = `Upload Label has been created`;
			this.isSwitchedToEditMode = false;
			this.layoutUtilsService.showActionNotification(_saveMessage, MessageType.Create, 10000, true, false);
			this.clearAddForm();			
			this.activityListForUploadLabel=this.activityListForUploadLabel.filter(x=>x.id !=_activityMessage['status_id'])
		},error=>{
			this.loadingAfterSubmit = false;
			this.activityMessageForAdd._isEditMode = false;
			this.isSwitchedToEditMode = false;
			this.layoutUtilsService.showActionNotification(error.error.message, MessageType.Update, 10000, true, false);
		});
	}

	// EDIT CATEGORY FUNCTIONS: clearEditForm | checkEditForm | editActivityMessageButtonOnClick | cancelEditButtonOnClick |
	clearEditForm() {
		const controls = this.formGroup.controls;
		controls['editActivity'].setValue('');
		controls['editText'].setValue('');	
		controls['editRequired'].setValue('');		
		this.activityMessageForEdit = new ProjectUploadLabelModel();
		this.activityMessageForEdit.clear();		
		this.activityMessageForEdit._isEditMode = false;
	}

	checkEditForm() {
		const controls = this.formGroup.controls;
		if (controls['editActivity'].invalid || controls['editText'].invalid || controls['editRequired'].invalid) {
			controls['editActivity'].markAsTouched();
			controls['editText'].markAsTouched();
			controls['editRequired'].markAsTouched();
			return false;
		}
		return true;
	}

	editActivityMessageButtonOnClick(_item: ProjectUploadLabelModel) {
		const controls = this.formGroup.controls;
		controls['editActivity'].setValue(_item.status_id);
		controls['editText'].setValue(_item.text);
		controls['editRequired'].setValue(_item.is_required);
		controls['id'].setValue(_item.id);
		_item._isEditMode = true;
		this.isSwitchedToEditMode = true;
		this.activityListForUploadLabel.push(this.activityList.find(x=>x.id==_item.status_id));
	}

	cancelEditButtonOnClick(_item: ProjectUploadLabelModel) {
		_item._isEditMode = false;
		this.isSwitchedToEditMode = false;
		this.activityListForUploadLabel.splice(-1,1)
	}

	saveUpdatedActivityMessage(_item: ProjectUploadLabelModel) {
		if (!this.checkEditForm()) {
			return;
		}
		this.loadingAfterSubmit = true;
		console.log("Update ActivityMessage",_item);
		const controls = this.formGroup.controls;
		var _activityMessage = {};
		_activityMessage = {
			"status_id": controls['editActivity'].value,
			"text": controls['editText'].value,
			"id": controls['id'].value,
			"projectId": _item.project_id,
		}
		var __this =  this;
		this.projectUploadLabelService.updateUploadLabel(_activityMessage).subscribe(res => {
			__this.loadingAfterSubmit = false;
			__this.activityMessageForAdd._isEditMode = false;
			__this.activityMessageListState.setItem(_item, StateActions.UPDATE);
			__this.loadUploadLabelsList();
			const saveMessage = `Activity message has been updated`;
			__this.isSwitchedToEditMode = false;
			__this.layoutUtilsService.showActionNotification(saveMessage, MessageType.Update, 10000, true, false);
		},error=>{			
			__this.loadingAfterSubmit = false;
			__this.activityMessageForAdd._isEditMode = false;			
			__this.isSwitchedToEditMode = false;			
			this.layoutUtilsService.showActionNotification(error.error.message, MessageType.Update, 10000, true, false);
		});	
	}
	
	/** FILTRATION */
	filterConfiguration(): any {
		const filter: any = {
			'fileds':[],
			'term_query': null,
			'term_fields': null,
		};		
		const searchText: string = this.searchInput.nativeElement.value;
		if (this.filterActivity && Number(this.filterActivity) > 0) {
			filter.fileds.push({'fieldName':'filter.status_id', 'fieldValue':this.filterActivity});
		}
		if(searchText){
			filter.term_query  = searchText;
			filter.term_fields = 'text';
		}
		return filter;
	}

	/** ACTIONS */
	/** Delete */
	deleteUploadLabel(_item: ProjectUploadLabelModel) {
		const _title: string = 'Upload Label Delete';
		const _description: string = 'Are you sure to permanently delete this Upload Label?';
		const _waitDesciption: string = 'Upload Label is deleting...';
		const _deleteMessage = `Upload Label has been deleted`;
		var __this = this;
		var _activityMessage = {
			"id":_item.id,
			"projectId":_item.project_id,
		}		
		const dialogRef = this.layoutUtilsService.deleteElement(_title, _description, _waitDesciption);
		dialogRef.afterClosed().subscribe(res => {
			if (!res) {
				return;
			}
			__this.projectUploadLabelService.deleteUploadLabel(_activityMessage).subscribe(res => {			
				_item._isDeleted = true;
				__this.activityMessageListState.setItem(_item, StateActions.DELETE);
				__this.layoutUtilsService.showActionNotification(_deleteMessage, MessageType.Delete);
				__this.loadUploadLabelsList();
				__this.activityListForUploadLabel.push(__this.activityList.find(x=>x.id==_item.status_id));
			},error=>{			
				_item._isDeleted = true;
				__this.activityMessageListState.setItem(_item, StateActions.DELETE);
				__this.layoutUtilsService.showActionNotification(error.error.message, MessageType.Delete);
			});
		});
	}

	
	getActivityNameByActivityId(activityId): String{
		if(this.activityList.length > 0){
			let activity = this.activityList.filter(function(obj){
						return obj.id == activityId;
			})
			if(activity.length > 0)	
				return activity[0].name;
			else
				return 'N/A'
		}else{
			return 'N/A';
		}
	}
	
	// Activity type list as array
	getCandidateStatus(){
		this.activityList =  [
			{'id': candQualifying,"name":'Qualifying'},
			{'id': candDisqualified,"name":'Disqualified'},
			{'id': candInterviewRequested,"name":'Interview Requested'},
			{'id': candInterviewFeedback,"name":'Interview Feedback'},
			{'id': candRejected,"name":'Rejected'},
			{'id': candHireRequested,"name":'Hire Requested'},
			{'id': candHireApproved,"name":'Hire Approved'},
			{'id': candHireRejected,"name":'Hire Rejected'}
		];
	}
}
