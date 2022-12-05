import { ComponentFixture, TestBed } from "@angular/core/testing";

import { BaseItemEditorComponent } from "./base-item-editor.component";
import { MockBuilder } from "ng-mocks";
import { provideMockStore } from "@ngrx/store/testing";
import { initialState } from "@app/store/state";
import { provideMockActions } from "@ngrx/effects/testing";
import { ReplaySubject } from "rxjs";
import { AppModule } from "@app/app.module";
import { CameraInterface } from "@features/equipment/types/camera.interface";
import { SensorInterface } from "@features/equipment/types/sensor.interface";
import { UtilsService } from "@shared/services/utils/utils.service";

describe("BaseEquipmentItemEditorComponent", () => {
  let component: BaseItemEditorComponent<CameraInterface, SensorInterface>;
  let fixture: ComponentFixture<BaseItemEditorComponent<CameraInterface, SensorInterface>>;

  beforeEach(async () => {
    await MockBuilder(BaseItemEditorComponent, AppModule).provide([
      provideMockStore({ initialState }),
      provideMockActions(() => new ReplaySubject<any>()),
      UtilsService
    ]);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseItemEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
