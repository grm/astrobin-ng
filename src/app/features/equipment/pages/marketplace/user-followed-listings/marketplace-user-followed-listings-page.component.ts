import { Component, OnInit } from "@angular/core";
import {
  MarketplaceFilterModel,
  MarketplaceRefreshOptions
} from "@features/equipment/components/marketplace-filter/marketplace-filter.component";
import { UserInterface } from "@shared/interfaces/user.interface";
import { SetBreadcrumb } from "@app/store/actions/breadcrumb.actions";
import { MarketplaceListingInterface } from "@features/equipment/types/marketplace-listing.interface";
import { takeUntil } from "rxjs/operators";
import { MarketplaceListingsBasePageComponent } from "@features/equipment/pages/marketplace/listings-base/marketplace-listings-base-page.component";

@Component({
  selector: "astrobin-marketplace-my-offers-page",
  templateUrl: "../listings-base/marketplace-listings-base-page.component.html",
  styleUrls: ["../listings-base/marketplace-listings-base-page.component.scss"]
})
export class MarketplaceUserFollowedListingsPageComponent extends MarketplaceListingsBasePageComponent implements OnInit {
  public refresh(
    filterModel?: MarketplaceFilterModel,
    options: MarketplaceRefreshOptions = {
      clear: true
    }
  ) {
    this.currentUser$.pipe(takeUntil(this.destroyed$)).subscribe(currentUser => {
      if (!currentUser) {
        return;
      }

      const modifiedFilterModel = {
        ...filterModel,
        followedByUser: currentUser.id
      };

      super.refresh(modifiedFilterModel, options);
    });
  }

  protected _setTitle(user: UserInterface) {
    this.title = this.translateService.instant("Listings you follow");
    this.titleService.setTitle(this.title);
  }

  protected _setBreadcrumbs(user: UserInterface) {
    this.store$.dispatch(
      new SetBreadcrumb({
        breadcrumb: [
          {
            label: this.translateService.instant("Equipment"),
            link: "/equipment/explorer"
          },
          {
            label: this.translateService.instant("Marketplace")
          },
          {
            label: this.translateService.instant("Listings you follow")
          }
        ]
      })
    );
  }

  protected _getListingsFilterPredicate(
    currentUser: UserInterface | null
  ): (listing: MarketplaceListingInterface) => boolean {
    return listing => listing.followed;
  }
}
