import { Component, Input, OnChanges, OnInit, SimpleChanges, TemplateRef, ViewChild } from "@angular/core";
import { select, Store } from "@ngrx/store";
import { BaseComponentDirective } from "@shared/components/base-component.directive";
import { MainState } from "@app/store/state";
import { DownloadLimitationOptions, ImageInterface, ImageRevisionInterface, ORIGINAL_REVISION_LABEL } from "@shared/interfaces/image.interface";
import { ClassicRoutesService } from "@shared/services/classic-routes.service";
import { Actions, ofType } from "@ngrx/effects";
import { AppActionTypes } from "@app/store/actions/app.actions";
import { filter, map, take, takeUntil } from "rxjs/operators";
import { DeleteImage, DeleteImageFailure, DeleteImageSuccess, SubmitImageForIotdTpConsideration, SubmitImageForIotdTpConsiderationSuccess, UnpublishImage, UnpublishImageSuccess } from "@app/store/actions/image.actions";
import { PopNotificationsService } from "@shared/services/pop-notifications.service";
import { ImageAlias } from "@shared/enums/image-alias.enum";
import { ImageService } from "@shared/services/image/image.service";
import { environment } from "@env/environment";
import { WindowRefService } from "@shared/services/window-ref.service";
import { NgbModalRef, NgbOffcanvas } from "@ng-bootstrap/ng-bootstrap";
import { DeviceService } from "@shared/services/device.service";
import { ConfirmationDialogComponent } from "@shared/components/misc/confirmation-dialog/confirmation-dialog.component";
import { TranslateService } from "@ngx-translate/core";
import { ModalService } from "@shared/services/modal.service";
import { UserSubscriptionService } from "@shared/services/user-subscription/user-subscription.service";
import { Router } from "@angular/router";
import { SubscriptionRequiredModalComponent } from "@shared/components/misc/subscription-required-modal/subscription-required-modal.component";
import { SimplifiedSubscriptionName } from "@shared/types/subscription-name.type";
import { ImageApiService } from "@shared/services/api/classic/images/image/image-api.service";
import { FormGroup } from "@angular/forms";
import { FormlyFieldConfig } from "@ngx-formly/core";
import { ActiveToast } from "ngx-toastr";
import { LoadingService } from "@shared/services/loading.service";
import { Observable, Subscription } from "rxjs";
import { selectImage } from "@app/store/selectors/app/image.selectors";
import { ImageIotdTpStatsInterface } from "@features/iotd/types/image-iotd-tp-stats.interface";
import { selectBackendConfig } from "@app/store/selectors/app/app.selectors";

@Component({
  selector: "astrobin-image-viewer-menu",
  template: `
    <ng-container *ngIf="currentUserWrapper$ | async as currentUserWrapper">
      <a
        [href]="classicRoutesService.IMAGE(image.hash || image.pk.toString())"
        [class]="itemClass"
      >
        {{ "Classic view" | translate }}
      </a>

      <ng-container *ngIf="currentUserWrapper.user?.id === image.user">
        <div [class]="dividerClass"></div>

        <a
          [routerLink]="['/i', image.hash || image.pk.toString(), 'edit']"
          [class]="itemClass"
        >
          {{ "Edit" | translate }}
        </a>

        <a
          *ngIf="image.solution"
          [routerLink]="['/i', image.hash || image.pk.toString(), 'plate-solving-settings']"
          [queryParams]="{ r: revisionLabel }"
          [class]="itemClass"
        >
          {{ "Edit plate-solving settings" | translate }}
          <span class="badge rounded-pill bg-light border border-dark fw-bold text-dark">
            <ng-container *ngIf="revisionLabel !== ORIGINAL_REVISION_LABEL">
              {{ "Revision" | translate }}: {{ revisionLabel }}
            </ng-container>
          </span>
        </a>

        <a
          [routerLink]="['/uploader/revision', image.hash || image.pk.toString()]"
          [class]="itemClass"
        >
          {{ "Upload new revision" | translate }}
        </a>

        <a
          (click)="uploadCompressedSourceClicked()"
          [class]="itemClass"
          astrobinEventPreventDefault
          href="#"
        >
          <ng-container *ngIf="image.uncompressedSourceFile">
            {{ "Replace/delete uncompressed source file" | translate }}
          </ng-container>
          <ng-container *ngIf="!image.uncompressedSourceFile">
            {{ "Upload uncompressed source (XISF/FITS/PSD/TIFF)" | translate }}
          </ng-container>
        </a>

        <a
          *ngIf="!image.isWip"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          (click)="unpublish()"
          [class]="itemClass"
          href="#"
        >
          {{ "Move to staging area" | translate }}
        </a>

        <a
          *ngIf="!image.submittedForIotdTpConsideration"
          (click)="openSubmitForIotdTpConsiderationOffcanvas()"
          [class]="itemClass"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          href="#"
        >
          {{ "Submit for IOTD/TP consideration" | translate }}
          <small *ngIf="image.published" class="d-block text-muted">
            {{ "Deadline" }}: {{ image.published | addDays: 30 | utcToLocal | date: "short" }}
          </small>
        </a>

        <a
          *ngIf="image.submittedForIotdTpConsideration"
          (click)="viewIotdTpStats()"
          [class]="itemClass"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          href="#"
        >
          {{ "View IOTD/TP stats" | translate }}
          <small class="d-block text-muted">
            {{ "Submitted" }}: {{ image.submittedForIotdTpConsideration | localDate | date: "short" }}
          </small>
        </a>

        <a
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          (click)="delete()"
          [class]="itemClass + ' text-danger'"
          href="#"
        >
          {{ "Delete" | translate }}
        </a>
      </ng-container>

      <ng-container
        *ngIf="
          currentUserWrapper.user?.id === image.user ||
          image.downloadLimitation === DownloadLimitationOptions.EVERYBODY"
      >
        <div [class]="dividerClass"></div>

        <a
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          (click)="openDownloadOffcanvas()"
          [class]="itemClass"
          href="#"
        >
          {{ "Download" | translate }}
        </a>
      </ng-container>

      <ng-container *ngIf="image.link || image.linkToFits">
        <div [class]="dividerClass"></div>

        <a
          *ngIf="image.link"
          [href]="image.link"
          [class]="itemClass"
        >
          {{ "External link" | translate }}
        </a>

        <a
          *ngIf="image.linkToFits"
          [href]="image.linkToFits"
          [class]="itemClass"
        >
          {{ "External link to FITS" | translate }}
        </a>
      </ng-container>
    </ng-container>

    <ng-template #downloadOffcanvasTemplate let-offcanvas>
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">{{ "Download" | translate }}</h5>
        <button type="button" class="btn-close" (click)="offcanvas.dismiss()"></button>
      </div>
      <div class="offcanvas-body">
        <a
          (click)="downloadImage(ImageAlias.REGULAR)"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          class="menu-item"
        >
          {{ "Medium" | translate }}
        </a>

        <a
          (click)="downloadImage(ImageAlias.HD)"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          class="menu-item"
        >
          {{ "Large" | translate }}
        </a>

        <a
          (click)="downloadImage(ImageAlias.QHD)"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          class="menu-item"
        >
          {{ "Extra large" | translate }}
        </a>

        <a
          (click)="downloadImage(ImageAlias.REAL)"
          astrobinEventPreventDefault
          astrobinEventStopPropagation
          class="menu-item"
        >
          {{ "Full size" | translate }}
        </a>

        <div class="menu-divider"></div>

        <ng-container *ngIf="revision.solution?.imageFile || revision.solution?.pixinsightSvgAnnotationHd">
          <a
            *ngIf="revision.solution.imageFile"
            (click)="downloadImage('basic_annotations')"
            astrobinEventPreventDefault
            astrobinEventStopPropagation
            class="menu-item"
          >
            {{ "Annotations" | translate }}
          </a>

          <a
            *ngIf="revision.solution.pixinsightSvgAnnotationHd"
            (click)="downloadImage('advanced_annotations')"
            astrobinEventPreventDefault
            astrobinEventStopPropagation
            class="menu-item"
          >
            {{ "Advanced annotations" | translate }}
          </a>
        </ng-container>

        <ng-container *ngIf="currentUserWrapper$ | async as currentUserWrapper">
          <a
            *ngIf="image.user === currentUserWrapper.user?.id"
            (click)="downloadImage('original')"
            astrobinEventPreventDefault
            astrobinEventStopPropagation
            class="menu-item"
          >
            <fa-icon icon="lock" class="me-2"></fa-icon>
            {{ "Original" | translate }}
          </a>

          <a
            [href]="image.uncompressedSourceFile"
            class="menu-item no-external-link-icon"
            target="_blank"
            rel="noopener noreferrer"
          >
            <fa-icon icon="lock" class="me-2"></fa-icon>
            {{ "Uncompressed source file" | translate }}
          </a>
        </ng-container>
      </div>
    </ng-template>

    <ng-template #submitForIotdTpConsiderationOffcanvas let-offcanvas>
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">
          <ng-container *ngIf="maySubmitForIotdTpConsideration === undefined">
            {{ "Loading..." | translate }}
          </ng-container>
          <ng-container *ngIf="maySubmitForIotdTpConsideration === true">
            {{ "Submit for IOTD/TP consideration" | translate }}
          </ng-container>
          <ng-container *ngIf="maySubmitForIotdTpConsideration === false">
            {{ "Error!" | translate }}
          </ng-container>
        </h5>
        <button type="button" class="btn-close" (click)="offcanvas.dismiss()"></button>
      </div>
      <div class="offcanvas-body">
        <ng-container *ngIf="maySubmitForIotdTpConsideration === true">
          <p class="alert alert-dark">
            {{
              "The “AstroBin Image of the Day and Top Picks” is a long-running system to promote beautiful, " +
              "interesting, peculiar, or otherwise amazing astrophotographs, with a focus on technical " +
              "excellence." | translate
            }}
          </p>

          <form [formGroup]="submitForIotdTpConsiderationForm" (ngSubmit)="submitForIotdTpConsideration()">
            <formly-form
              [model]="submitForIotdTpConsiderationModel"
              [fields]="submitForIotdTpConsiderationFields"
            ></formly-form>

            <div class="form-actions">
              <button
                [class.loading]="loadingService.loading$ | async"
                class="btn btn-primary w-100"
                type="submit"
              >
                {{ "Submit" | translate }}
              </button>
            </div>
          </form>
        </ng-container>

        <ng-container *ngIf="maySubmitForIotdTpConsideration === false">
          <p>
            <fa-icon icon="exclamation-triangle" class="me-2"></fa-icon>
            <span [innerHTML]="reasonIfCannotSubmitForIotdTpConsideration"></span>
          </p>
        </ng-container>

        <ng-container
          *ngIf="maySubmitForIotdTpConsideration === undefined"
          [ngTemplateOutlet]="loadingTemplate"
        >
        </ng-container>
      </div>
    </ng-template>

    <ng-template #viewIotdTpStatsOffcanvas let-offcanvas>
      <div class="offcanvas-header">
        <h5 class="offcanvas-title">
          {{ "IOTD/TP stats" | translate }}
          <fa-icon icon="lock" class="ms-2"></fa-icon>
        </h5>
        <button type="button" class="btn-close" (click)="offcanvas.dismiss()"></button>
      </div>
      <div class="offcanvas-body">
        <ng-container *ngIf="getIotdTpStatsLegend$() | async as legend">
          <ngb-accordion *ngIf="iotdTpStats; else loadingTemplate" #accordion="ngbAccordion" class="iotd-stats-accordion">
            <ngb-panel>
              <ng-template ngbPanelTitle>
                <div class="image-iotd-tp-stats-item">
                  <span class="name">{{ "Submitted" | translate }}</span>
                  <span class="value">{{ image.submittedForIotdTpConsideration | localDate | date: "short" }}</span>
                </div>
              </ng-template>

              <ng-template ngbPanelContent>
                {{ legend["submittedForIotdTpConsideration"] }}
              </ng-template>
            </ngb-panel>
            <ngb-panel>
              <ng-template ngbPanelTitle>
                <div class="image-iotd-tp-stats-item">
                  <span
                    class="name">{{ "Views by Submitters (available since September 19th, 2023)" | translate }}</span>
                  <span class="value">{{ iotdTpStats.submitter_views_percentage }}</span>
                </div>
              </ng-template>

              <ng-template ngbPanelContent>
                {{ legend["submitter_views_percentage"] }}
              </ng-template>
            </ngb-panel>

            <ngb-panel>
              <ng-template ngbPanelTitle>
                <div class="image-iotd-tp-stats-item">
                  <span class="name">{{ "Promotions by Submitters" | translate }}</span>
                  <span class="value">{{ iotdTpStats.submissions }}</span>
                </div>
              </ng-template>

              <ng-template ngbPanelContent>
                {{ legend["submissions"] }}
              </ng-template>
            </ngb-panel>

            <ngb-panel>
              <ng-template ngbPanelTitle>
                <div class="image-iotd-tp-stats-item">
                  <span class="name">{{ "Promotions by Reviewers" | translate }}</span>
                  <span class="value">{{ iotdTpStats.votes }}</span>
                </div>
              </ng-template>

              <ng-template ngbPanelContent>
                {{ legend["votes"] }}
              </ng-template>
            </ngb-panel>

            <ngb-panel>
              <ng-template ngbPanelTitle>
                <div class="image-iotd-tp-stats-item">
                  <span class="name">{{ "Early dismissal" | translate }}</span>
                  <span class="value">{{ iotdTpStats.early_dismissal }}</span>
                </div>
              </ng-template>

              <ng-template ngbPanelContent>
                {{ legend["early_dismissal"] }}
              </ng-template>
            </ngb-panel>
          </ngb-accordion>
        </ng-container>
      </div>
    </ng-template>

    <ng-template #loadingTemplate>
      <astrobin-loading-indicator></astrobin-loading-indicator>
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        overflow-y: auto;
        gap: 1px;
      }

      ::ng-deep .iotd-stats-accordion {
        .image-iotd-tp-stats-item {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-right: 1rem;
          gap: 1rem;

          .name {
            color: var(--lightestGrey);
          }

          .value {
            color: var(--white);
            font-weight: bold;
          }
        }
      }
    `
  ]
})
export class ImageViewerMenuComponent extends BaseComponentDirective implements OnInit, OnChanges {
  @Input() image: ImageInterface;
  @Input() revisionLabel: string;
  @Input() itemClass: string;
  @Input() dividerClass: string;

  @ViewChild("downloadOffcanvasTemplate") downloadOffcanvasTemplate: TemplateRef<any>;
  @ViewChild("submitForIotdTpConsiderationOffcanvas") submitForIotdTpConsiderationOffcanvas: TemplateRef<any>;
  @ViewChild("viewIotdTpStatsOffcanvas") viewIotdTpStatsOffcanvas: TemplateRef<any>;

  protected readonly DownloadLimitationOptions = DownloadLimitationOptions;
  protected readonly ImageAlias = ImageAlias;
  protected readonly ORIGINAL_REVISION_LABEL = ORIGINAL_REVISION_LABEL;

  protected readonly submitForIotdTpConsiderationForm = new FormGroup({});
  protected readonly submitForIotdTpConsiderationModel: {
    agreedToIotdTpRulesAndGuidelines: boolean
  } = {
    agreedToIotdTpRulesAndGuidelines: false
  };
  protected readonly submitForIotdTpConsiderationFields: FormlyFieldConfig[] = [
    {
      key: "agreedToIotdTpRulesAndGuidelines",
      type: "checkbox",
      wrappers: ["default-wrapper"],
      props: {
        label: this.translateService.instant("I agree to the IOTD/TP rules and guidelines"),
        description: this.translateService.instant(
          "By submitting your image for consideration, you agree to the IOTD/TP " +
          "{{ 0 }}rules{{ 1 }} and {{ 2 }}guidelines.{{ 3 }}", {
            0: "<a href='https://welcome.astrobin.com/iotd#rules' target='_blank' rel='noopener'>",
            1: "</a>",
            2: "<a href='https://welcome.astrobin.com/iotd#photographer-guidelines' target='_blank' rel='noopener'>",
            3: "</a>"
          }
        ),
        required: true
      }
    }
  ];

  protected revision: ImageInterface | ImageRevisionInterface;
  protected maySubmitForIotdTpConsideration: boolean;
  protected reasonIfCannotSubmitForIotdTpConsideration: string;
  protected iotdTpStats: ImageIotdTpStatsInterface;

  private _agreedToIotdTpRulesAndGuidelinesNotification: ActiveToast<any>;
  private _selectImageSubscription: Subscription;

  constructor(
    public readonly store$: Store<MainState>,
    public readonly actions$: Actions,
    public readonly classicRoutesService: ClassicRoutesService,
    public readonly popNotificationsService: PopNotificationsService,
    public readonly imageService: ImageService,
    public readonly windowRefService: WindowRefService,
    public readonly offcanvasService: NgbOffcanvas,
    public readonly deviceService: DeviceService,
    public readonly modalService: ModalService,
    public readonly translateService: TranslateService,
    public readonly userSubscriptionService: UserSubscriptionService,
    public readonly router: Router,
    public readonly imageApiService: ImageApiService,
    public readonly loadingService: LoadingService
  ) {
    super(store$);
  }

  ngOnInit(): void {
    this._initSubmitForIotdTpConsiderationForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.image || changes.revisionLabel) {
      if (this.image && this.revisionLabel) {
        this.revision = this.imageService.getRevision(this.image, this.revisionLabel);
      }

      if (changes.image) {
        if (this._selectImageSubscription) {
          this._selectImageSubscription.unsubscribe();
        }

        this._selectImageSubscription = this.store$.pipe(
          select(selectImage, this.image.pk),
          filter(image => !!image),
          takeUntil(this.destroyed$)
        ).subscribe(image => {
          this.image = image;
          this.revision = this.imageService.getRevision(this.image, this.revisionLabel);
        });
      }
    }
  }

  unpublish() {
    this.actions$.pipe(
      ofType(AppActionTypes.UNPUBLISH_IMAGE_SUCCESS),
      filter((action: UnpublishImageSuccess) => action.payload.pk === this.image.pk),
      take(1)
    ).subscribe(() => {
      this.popNotificationsService.success("Image moved to your staging area.");
    });

    this.store$.dispatch(new UnpublishImage({ pk: this.image.pk }));
  }

  delete() {
    const modalRef: NgbModalRef = this.modalService.open(ConfirmationDialogComponent);
    const instance: ConfirmationDialogComponent = modalRef.componentInstance;

    instance.message = this.translateService.instant(
      "Your image will be deleted along with all revisions and metadata."
    );

    modalRef.closed.subscribe(() => {
      const loadingModalRef: NgbModalRef = this.modalService.openLoadingDialog();

      this.actions$.pipe(
        ofType(AppActionTypes.DELETE_IMAGE_SUCCESS, AppActionTypes.DELETE_IMAGE_FAILURE), // Listen for both success and failure
        filter((action: DeleteImageSuccess | DeleteImageFailure) => action.payload.pk === this.image.pk),
        take(1)
      ).subscribe(() => {
        loadingModalRef.close();
      });

      this.store$.dispatch(new DeleteImage({ pk: this.image.pk }));
    });
  }

  openDownloadOffcanvas() {
    this.offcanvasService.dismiss(); // Avoids nested offcanvases.
    this.offcanvasService.open(
      this.downloadOffcanvasTemplate, {
        panelClass: "offcanvas-menu",
        position: this.deviceService.mdMax() ? "start" : "end"
      }
    );
  }

  downloadImage(version: ImageAlias | "original" | "basic_annotations" | "advanced_annotations") {
    const url = `${environment.classicBaseUrl}/download/${this.image.hash || this.image.pk}/${this.revisionLabel}/${version}/`;
    this.windowRefService.nativeWindow.open(url, "_blank");
  }

  uploadCompressedSourceClicked() {
    this.userSubscriptionService.isUltimate$().pipe(take(1)).subscribe(isUltimate => {
      if (isUltimate) {
        this.router.navigate(["/uploader/uncompressed-source", this.image.hash || this.image.pk.toString()]);
      } else {
        const modalRef = this.modalService.open(SubscriptionRequiredModalComponent);
        modalRef.componentInstance.minimumSubscription = SimplifiedSubscriptionName.ASTROBIN_ULTIMATE_2020;
      }
    });
  }

  openSubmitForIotdTpConsiderationOffcanvas() {
    this.offcanvasService.dismiss(); // Avoids nested offcanvases.
    this.offcanvasService.open(this.submitForIotdTpConsiderationOffcanvas, {
      position: this.deviceService.offcanvasPosition()
    });

    this.imageApiService.maySubmitForIotdTpConsideration(this.image.pk).subscribe(response => {
      this.maySubmitForIotdTpConsideration = response.may;
      this.reasonIfCannotSubmitForIotdTpConsideration = response.humanizedReason;
    });
  }

  submitForIotdTpConsideration() {
    if (!this.submitForIotdTpConsiderationModel.agreedToIotdTpRulesAndGuidelines) {
      this._agreedToIotdTpRulesAndGuidelinesNotification = this.popNotificationsService.error(
        this.translateService.instant("Please agree to the IOTD/TP rules and guidelines.")
      );
      return;
    }

    if (this._agreedToIotdTpRulesAndGuidelinesNotification) {
      this.popNotificationsService.remove(this._agreedToIotdTpRulesAndGuidelinesNotification.toastId);
      this._agreedToIotdTpRulesAndGuidelinesNotification = undefined;
    }

    this.actions$.pipe(
      ofType(AppActionTypes.SUBMIT_IMAGE_FOR_IOTD_TP_CONSIDERATION_SUCCESS),
      filter((action: SubmitImageForIotdTpConsiderationSuccess) => action.payload.image.pk === this.image.pk),
      take(1)
    ).subscribe(() => {
      this.offcanvasService.dismiss();
    });

    this.store$.dispatch(new SubmitImageForIotdTpConsideration({ pk: this.image.pk }));
  }

  viewIotdTpStats() {
    this.offcanvasService.dismiss(); // Avoids nested offcanvases.
    this.offcanvasService.open(this.viewIotdTpStatsOffcanvas, {
      position: this.deviceService.offcanvasPosition()
    });

    this.imageApiService.getImageStats(this.image.hash || this.image.pk).subscribe(stats => {
      this.iotdTpStats = stats;
    });
  }

  getIotdTpStatsLegend$(): Observable<{ [key: string]: string }> {
    return this.store$.pipe(
      select(selectBackendConfig),
      filter(backendConfig => !!backendConfig),
      take(1),
      map(backendConfig => {
        return {
          "submittedForIotdTpConsideration" : this.translateService.instant(
            "The date and time when this image was submitted for IOTD/TP consideration. AstroBin may " +
            "automatically resubmit your image multiple times if necessary."
          ),
          "submitter_views_percentage": this.translateService.instant(
            "Every image is assigned to {{ 0 }} of available Submitters. In the event that at least 80% of them " +
            "don't view the image before its time in the IOTD/TP process expires, it's assigned to the other {{ 0 }} " +
            "of Submitters and the process begins anew.", {
              0: `${backendConfig.IOTD_DESIGNATED_SUBMITTERS_PERCENTAGE}%`,
            }
          ),
          "submissions": this.translateService.instant(
            "When {{ 0 }} distinct Submitters promote the image, it moves on to the next stage of the process: " +
            "evaluation for Top Pick status. This requirement, in addition to anonymization of images and " +
            "distribution to only a subset of them, prevents biases and ensures that the best images are " +
            "selected.", {
              0: backendConfig.IOTD_SUBMISSION_MIN_PROMOTIONS
            }
          ),
          "votes": this.translateService.instant(
            "When {{ 0 }} distinct Reviewers promote the image, it moves on to the next stage of the process: " +
            "evaluation for IOTD status.", {
              0: backendConfig.IOTD_REVIEW_MIN_PROMOTIONS
            }
          ),
          "early_dismissal": this.translateService.instant(
            "Staff members have a lot of images to inspect on a daily basis, and they can dismiss images if " +
            "they believe they don't meet the requirements for IOTD/TP selection. If an image is dismissed {{ 0 }} " +
            "times, it's removed from the process. This streamlines the process and ensures that any bias " +
            "present in promotions could be overruled by other staff members.", {
              0: backendConfig.IOTD_MAX_DISMISSALS
            }
          )
        }
      })
    );
  }

  private _initSubmitForIotdTpConsiderationForm(): void {
    this.currentUserProfile$.pipe(take(1)).subscribe(currentUserProfile => {
      this.submitForIotdTpConsiderationModel.agreedToIotdTpRulesAndGuidelines = currentUserProfile?.agreedToIotdTpRulesAndGuidelines;
    });
  }
}
