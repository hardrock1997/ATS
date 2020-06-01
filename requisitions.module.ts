import { NgModule } from '@angular/core';
import { CommonModule,  } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { PartialsModule } from '../../../partials/partials.module';
import { SharedModule } from '../../_shared/shared.module';
import { RequisitionsComponent } from './requisitions.component';
//Prevent Unsaved Changes Gurad
import { PreventUnsavedChangesGuard } from '../../guard/prevent-unsaved-changes-guard.guard';
// Core => Services
import { RequisitionService } from './_core/services/index';
// Core => Utils
import { HttpUtilsService } from '../../_shared/_core/utils/http-utils.service';
import { TypesUtilsService } from '../../_shared/_core/utils/types-utils.service';
import { LayoutUtilsService } from '../../_shared/utils/layout-utils.service';
import { InterceptService } from '../../../../core/services/intercept.service';
import { ActivityMessengerService } from '../../../../core/services/activity-messenger.service';
// Shared
import { RejectEntityDialogComponent } from '../../_shared/reject-entity-dialog/reject-entity-dialog.component';
// Requisitions
import { RequisitionEditComponent } from './requisition-edit/requisition-edit.component';
import { RequisitionViewComponent } from './requisition-view/requisition-view.component';
// Material
import {
	MatInputModule,
	MatPaginatorModule,
	MatProgressSpinnerModule,
	MatSortModule,
	MatTableModule,
	MatSelectModule,
	MatMenuModule,
	MatProgressBarModule,
	MatButtonModule,
	MatCheckboxModule,
	MatDialogModule,
	MatTabsModule,
	MatNativeDateModule,
	MatCardModule,
	MatRadioModule,
	MatIconModule,
	MatDatepickerModule,
	MatAutocompleteModule,
	MAT_DIALOG_DEFAULT_OPTIONS,
	MatSnackBarModule,
	MatTooltipModule
} from '@angular/material';
import { environment } from '../../../../../environments/environment';
import { RequisitionActivityLogComponent } from './requisition-activity-log/requisition-activity-log.component';
import { CKEditorModule } from 'ckeditor4-angular';
const routes: Routes = [		
		{
			path: '',
			component: RequisitionsComponent,
		},
		{
			path: 'add',
			component: RequisitionEditComponent,
			canDeactivate: [ PreventUnsavedChangesGuard ]
		},
		{
			path: 'edit',
			component: RequisitionEditComponent,
			canDeactivate: [ PreventUnsavedChangesGuard ]
		},
		{
			path: 'edit/:id',
			component: RequisitionEditComponent,
			canDeactivate: [ PreventUnsavedChangesGuard ]
		},
		{
			path: 'view',
			component: RequisitionViewComponent
		},
		{
			path: 'view/:id',
			component: RequisitionViewComponent
		},
];

@NgModule({
	imports: [
		MatDialogModule,
		CommonModule,
		HttpClientModule,
		PartialsModule,
		SharedModule,
		RouterModule.forChild(routes),
		FormsModule,
		ReactiveFormsModule,
		TranslateModule.forChild(),		
		MatButtonModule,
		MatMenuModule,
		MatSelectModule,
        MatInputModule,
		MatTableModule,
		MatAutocompleteModule,
		MatRadioModule,
		MatIconModule,
		MatNativeDateModule,
		MatProgressBarModule,
		MatDatepickerModule,
		MatCardModule,
		MatPaginatorModule,
		MatSortModule,
		MatCheckboxModule,
		MatProgressSpinnerModule,
		MatSnackBarModule,
		MatTabsModule,
		MatTooltipModule,
		environment.isMockEnabled ? [] : [],
		AngularEditorModule,
		CKEditorModule,
	],
	providers: [
		InterceptService,
      	{
        	provide: HTTP_INTERCEPTORS,
       	 	useClass: InterceptService,
        	multi: true
      	},
		{
			provide: MAT_DIALOG_DEFAULT_OPTIONS,
			useValue: {
				hasBackdrop: true,
				panelClass: 'm-mat-dialog-container__wrapper',
				height: 'auto',
				width: '900px'
			}
		},
		HttpUtilsService,		
		RequisitionService,		
		TypesUtilsService,
		LayoutUtilsService,
		ActivityMessengerService,
		PreventUnsavedChangesGuard
	],
	entryComponents: [
		RejectEntityDialogComponent,	
	],
	declarations: [
		RequisitionsComponent,
		RejectEntityDialogComponent,
		RequisitionEditComponent,
		RequisitionViewComponent,
		RequisitionActivityLogComponent,
	]
})
export class RequisitionsModule { }
