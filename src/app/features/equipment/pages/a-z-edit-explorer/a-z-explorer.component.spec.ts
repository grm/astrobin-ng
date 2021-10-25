import { ComponentFixture, TestBed } from "@angular/core/testing";

import { AZExplorerComponent } from "./a-z-explorer.component";
import { MockBuilder } from "ng-mocks";
import { provideMockStore } from "@ngrx/store/testing";
import { initialState } from "@app/store/state";
import { AppModule } from "@app/app.module";
import { ActivatedRoute, Router } from "@angular/router";
import { EMPTY, of, ReplaySubject } from "rxjs";
import { ItemTypeNavComponent } from "@features/equipment/components/item-type-nav/item-type-nav.component";
import { ItemBrowserComponent } from "@features/equipment/components/item-browser/item-browser.component";
import { provideMockActions } from "@ngrx/effects/testing";

describe("AZProposalExplorerComponent", () => {
  let component: AZExplorerComponent;
  let fixture: ComponentFixture<AZExplorerComponent>;

  beforeEach(async () => {
    await MockBuilder(AZExplorerComponent, AppModule)
      .mock(ItemTypeNavComponent)
      .mock(ItemBrowserComponent)
      .provide([
        provideMockStore({ initialState }),
        provideMockActions(() => new ReplaySubject<any>()),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: key => "camera" }
            }
          }
        },
        {
          provide: Router,
          useValue: {
            events: EMPTY
          }
        }
      ]);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AZExplorerComponent);
    component = fixture.componentInstance;

    jest.spyOn(component.equipmentApiService, "getAllEquipmentItems").mockReturnValue(
      of({
        count: 0,
        next: null,
        prev: null,
        results: []
      })
    );

    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});