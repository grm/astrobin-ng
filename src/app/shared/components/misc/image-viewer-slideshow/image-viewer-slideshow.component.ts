import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, Output, PLATFORM_ID, Renderer2, ViewChild } from "@angular/core";
import { FINAL_REVISION_LABEL, ImageInterface, ImageRevisionInterface } from "@shared/interfaces/image.interface";
import { ImageViewerNavigationContext, ImageViewerNavigationContextItem } from "@shared/services/image-viewer.service";
import { BaseComponentDirective } from "@shared/components/base-component.directive";
import { MainState } from "@app/store/state";
import { Store } from "@ngrx/store";
import { ImageService } from "@shared/services/image/image.service";
import { NgbCarousel, NgbSlideEvent } from "@ng-bootstrap/ng-bootstrap";
import { UtilsService } from "@shared/services/utils/utils.service";
import { distinctUntilChanged, filter, map, switchMap, takeUntil } from "rxjs/operators";
import { Observable, Subscription } from "rxjs";
import { ImageAlias } from "@shared/enums/image-alias.enum";
import { NavigationEnd, Router } from "@angular/router";
import { ForceCheckTogglePropertyAutoLoad } from "@app/store/actions/image.actions";
import { WindowRefService } from "@shared/services/window-ref.service";
import { DeviceService } from "@shared/services/device.service";
import { HideFullscreenImage } from "@app/store/actions/fullscreen-image.actions";
import { isPlatformBrowser } from "@angular/common";

const SLIDESHOW_BUFFER = 1;
const SLIDESHOW_WINDOW = 3;

@Component({
  selector: "astrobin-image-viewer-slideshow",
  template: `
    <div #carouselContainer *ngIf="!fullscreen" class="carousel-container">
      <div class="carousel-area">
        <ngb-carousel
          #carousel
          *ngIf="visibleContext.length > 0; else loadingTemplate"
          (slide)="onSlide($event)"
          [animation]="false"
          [activeId]="activeId"
          [interval]="0"
          [showNavigationArrows]="false"
          [showNavigationIndicators]="false"
          [keyboard]="false"
          [wrap]="false"
          [class.is-on-first]="activeId === navigationContext[0].imageId"
          [class.is-on-last]="activeId === navigationContext[navigationContext.length - 1].imageId"
        >
          <ng-template
            ngbSlide
            *ngFor="let item of visibleContext; let i = index; trackBy: contextTrackByFn"
            [attr.id]="item.imageId"
          >
            <div
              class="pan-container"
              (swipeleft)="onNextClick()"
              (swiperight)="onPreviousClick()"
            >
              <astrobin-image-viewer
                *ngIf="item.image && !loadingImage; else loadingTemplate"
                (closeClick)="closeSlideshow.emit(true)"
                (nextClick)="onNextClick()"
                (previousClick)="onPreviousClick()"
                (revisionSelected)="onRevisionSelected($event)"
                [active]="item.imageId === activeId"
                [image]="item.image"
                [revisionLabel]="activeImageRevisionLabel"
                [showCloseButton]="true"
                [showPreviousButton]="activeId !== navigationContext[0].imageId"
                [showNextButton]="activeId !== navigationContext[navigationContext.length - 1].imageId"
                [standalone]="false"
              ></astrobin-image-viewer>
            </div>
          </ng-template>
        </ngb-carousel>
      </div>

      <div *ngIf="navigationContext?.length > 1" class="context-area">
        <astrobin-image-viewer-slideshow-context
          [activeId]="activeId"
          [callerComponentId]="callerComponentId"
          [navigationContext]="navigationContext"
          (itemSelected)="setImage($event, FINAL_REVISION_LABEL).subscribe()"
          (nearEndOfContext)="nearEndOfContext.emit($event)"
        ></astrobin-image-viewer-slideshow-context>
      </div>
    </div>

    <astrobin-fullscreen-image-viewer
      *ngIf="activeImage"
      [id]="activeImage.pk"
      [revision]="activeImageRevisionLabel"
      (enterFullscreen)="onEnterFullscreen()"
      (exitFullscreen)="onExitFullscreen()"
    ></astrobin-fullscreen-image-viewer>

    <ng-template #loadingTemplate>
      <astrobin-loading-indicator></astrobin-loading-indicator>
    </ng-template>
  `,
  styleUrls: ["./image-viewer-slideshow.component.scss"]
})
export class ImageViewerSlideshowComponent extends BaseComponentDirective implements OnDestroy {
  @Input()
  imageId: ImageInterface["pk"] | ImageInterface["hash"];

  @Input()
  navigationContext: ImageViewerNavigationContext;

  @Output()
  closeSlideshow = new EventEmitter<boolean>();

  @Output()
  nearEndOfContext = new EventEmitter<ImageViewerNavigationContextItem["imageId"]>();

  @Output()
  imageChange = new EventEmitter<ImageInterface>();

  activeId: ImageInterface["pk"] | ImageInterface["hash"];
  activeImage: ImageInterface;
  activeImageRevisionLabel: ImageRevisionInterface["label"] = FINAL_REVISION_LABEL;

  @ViewChild("carousel", { static: false, read: NgbCarousel })
  protected carousel: NgbCarousel;

  @ViewChild("carouselContainer")
  protected carouselContainer: ElementRef;

  protected readonly FINAL_REVISION_LABEL = FINAL_REVISION_LABEL;

  protected visibleContext: ImageViewerNavigationContext = [];
  protected fullscreen = false;
  protected loadingImage = false;
  protected callerComponentId: string;

  private _delayedLoadSubscription: Subscription = new Subscription();
  private _skipSlideEvent = false;
  private _navigationInProgress = false;

  constructor(
    public readonly store$: Store<MainState>,
    public readonly imageService: ImageService,
    public readonly utilsService: UtilsService,
    public readonly router: Router,
    public readonly windowRefService: WindowRefService,
    @Inject(PLATFORM_ID) public readonly platformId: Object,
    public readonly elementRef: ElementRef,
    public readonly deviceService: DeviceService,
    public readonly renderer: Renderer2,
    public readonly changeDetectorRef: ChangeDetectorRef
  ) {
    super(store$);

    router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map((event: NavigationEnd) => event.urlAfterRedirects),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
      .subscribe(url => {
        const imageId = this.router.parseUrl(url).queryParams["i"];
        const revisionLabel = this.router.parseUrl(url).queryParams["r"] || FINAL_REVISION_LABEL;
        if (imageId) {
          this.setImage(imageId, revisionLabel, false).subscribe();
        }
      });
  }

  @HostListener("window:popstate", ["$event"])
  onPopState(event: PopStateEvent) {
    if (this.fullscreen) {
      this.store$.dispatch(new HideFullscreenImage());
      this.onExitFullscreen();
    } else if (event.state?.imageId && this.activeId !== event.state.imageId) {
      this.setImage(
        event.state.imageId,
        event.state.revisionLabel || FINAL_REVISION_LABEL,
        false).subscribe();
    } else {
      this.closeSlideshow.emit(false);
    }
  }

  ngOnDestroy() {
    this._delayedLoadSubscription.unsubscribe();
  }

  setCallerComponentId(callerComponentId: string) {
    this.callerComponentId = callerComponentId;
  }

  setNavigationContext(newContext: ImageViewerNavigationContext) {
    if (this.navigationContext) {
      this.navigationContext = newContext.map((item, index) => {
        const existingItem = this.navigationContext.find(i => i.imageId === item.imageId);
        if (existingItem) {
          return existingItem;
        }

        return item;
      });
    } else {
      this.navigationContext = newContext;
    }

    this._updateVisibleContext();
  }

  setImage(
    imageId: ImageInterface["pk"] | ImageInterface["hash"],
    revisionLabel: ImageRevisionInterface["label"],
    emitChange: boolean = true): Observable<ImageInterface> {
    this.loadingImage = true;

    return new Observable(subscriber => {
      this._loadImage(imageId).subscribe(image => {
        this.loadingImage = false;
        this.activeId = imageId;
        this.activeImage = image;
        this.activeImageRevisionLabel = revisionLabel || FINAL_REVISION_LABEL;
        this._updateVisibleContext();
        this._loadAdjacentImages();
        this._dropImagesTooFarFromIndex();

        this.utilsService.delay(200).subscribe(() => {
          this.store$.dispatch(new ForceCheckTogglePropertyAutoLoad());

          if (this.carousel) {
            this._skipSlideEvent = true;
            this.carousel.select(imageId.toString());
            this._skipSlideEvent = false;
            this.carousel.focus();
          }

          if (emitChange) {
            this.imageChange.emit(image);
          }

          subscriber.next(image);
          subscriber.complete();
        });
      });
    });
  }

  protected onEnterFullscreen() {
    this.fullscreen = true;
    this.changeDetectorRef.detectChanges();
  }

  protected onExitFullscreen() {
    if (isPlatformBrowser(this.platformId)) {
      const location_ = this.windowRefService.nativeWindow.location;
      this.windowRefService.replaceState(
        {},
        `${location_.pathname}${location_.search}`
      );
    }

    this.utilsService.delay(50).subscribe(() => {
      this.fullscreen = false;
      this.changeDetectorRef.detectChanges();
      this.store$.dispatch(new ForceCheckTogglePropertyAutoLoad());
    });
  }

  protected onNextClick() {
    if (this.loadingImage || this._navigationInProgress) {
      return;
    }

    this._navigationInProgress = true;
    this.carousel.next();

    this.utilsService.delay(250).subscribe(() => {
      this._navigationInProgress = false;
    });
  }

  protected onPreviousClick() {
    if (this.loadingImage || this._navigationInProgress) {
      return;
    }

    this._navigationInProgress = true;
    this.carousel.prev();

    this.utilsService.delay(250).subscribe(() => {
      this._navigationInProgress = false;
    });
  }

  protected onSlide(event: NgbSlideEvent) {
    if (this._skipSlideEvent) {
      this._navigationInProgress = false;
      return;
    }

    if (!event.current || this.activeId === event.current) {
      this._navigationInProgress = false;
      return;
    }

    this.setImage(event.current, FINAL_REVISION_LABEL).subscribe(() => {
      this._navigationInProgress = false;
    });
  }

  protected onRevisionSelected(revisionLabel: ImageRevisionInterface["label"]) {
    this.activeImageRevisionLabel = revisionLabel;
    this.changeDetectorRef.detectChanges();
  }

  protected contextTrackByFn(index: number, item: ImageViewerNavigationContextItem) {
    return item.imageId;
  }

  private _updateVisibleContext() {
    const currentIndex = this._getImageIndexInContext(this.activeId);
    if (currentIndex === -1) {
      this.visibleContext = [...this.navigationContext];
      return;
    }

    if (this.navigationContext.length === 1) {
      this.visibleContext = [this.navigationContext[0]];
      return;
    }

    if (currentIndex === 0) {
      this.visibleContext = this.navigationContext.slice(0, 2);
      return;
    }

    if (currentIndex === this.navigationContext.length - 1) {
      this.visibleContext = this.navigationContext.slice(-2);
      return;
    }

    this.visibleContext = this.navigationContext.slice(currentIndex - 1, currentIndex + 2);
  }

  private _loadAdjacentImages() {
    const index = this._getImageIndexInContext(this.activeId);
    for (let i = index - SLIDESHOW_BUFFER; i <= index + SLIDESHOW_BUFFER; i++) {
      if (i >= 0 && i < this.navigationContext.length && i !== index) {
        this._loadImage(this.navigationContext[i].imageId, Math.abs(index - i) * 100).subscribe(() => {
          this._updateVisibleContext();
        });
      }
    }
  }

  private _dropImagesTooFarFromIndex() {
    const index = this._getImageIndexInContext(this.activeId);
    this.navigationContext = this.navigationContext.map((item, i) => {
      if (Math.abs(index - i) > SLIDESHOW_WINDOW) {
        return { ...item, image: undefined };
      }
      return item;
    });
  }

  private _loadImage(
    imageId: ImageInterface["pk"] | ImageInterface["hash"],
    delay: number = 0
  ): Observable<ImageInterface> {
    return new Observable(subscriber => {
      const index = this._getImageIndexInContext(imageId);

      if (this.navigationContext && this.navigationContext[index]?.image) {
        subscriber.next(this.navigationContext[index].image);
        subscriber.complete();
        return;
      }

      this._delayedLoadSubscription.add(
        this.utilsService.delay(delay).pipe(
          switchMap(() => this.imageService.loadImage(imageId))
        ).subscribe(image => {
          if (!this.navigationContext || !this.navigationContext.length) {
            this.navigationContext = [
              {
                imageId,
                thumbnailUrl: image.thumbnails.find(thumbnail => thumbnail.alias === ImageAlias.GALLERY).url,
                image
              }
            ];
          } else {
            this.navigationContext = this.navigationContext.map(item => {
              if (item.imageId === imageId) {
                return {
                  ...item,
                  image
                };
              }

              return item;
            });
          }

          subscriber.next(image);
          subscriber.complete();
        })
      );
    });
  }

  private _getImageIndexInContext(imageId: ImageInterface["pk"] | ImageInterface["hash"]): number {
    return this.navigationContext.findIndex(item => item.imageId === imageId);
  }
}