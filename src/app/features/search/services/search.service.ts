import { BaseService } from "@shared/services/base.service";
import { LoadingService } from "@shared/services/loading.service";
import { ComponentRef, Inject, Injectable, Type, ViewContainerRef } from "@angular/core";
import { Observable, of } from "rxjs";
import { TranslateService } from "@ngx-translate/core";
import { EquipmentApiService } from "@features/equipment/services/equipment-api.service";
import { PaginatedApiResultInterface } from "@shared/services/api/interfaces/paginated-api-result.interface";
import { TelescopeInterface, TelescopeType } from "@features/equipment/types/telescope.interface";
import { EquipmentItemType } from "@features/equipment/types/equipment-item-base.interface";
import { map } from "rxjs/operators";
import { CameraInterface, CameraType } from "@features/equipment/types/camera.interface";
import { SearchFilterComponentInterface } from "@features/search/interfaces/search-filter-component.interface";
import {
  AUTO_COMPLETE_ONLY_FILTERS_TOKEN,
  SEARCH_FILTERS_TOKEN
} from "@features/search/injection-tokens/search-filter.tokens";
import { DynamicSearchFilterLoaderService } from "@features/search/services/dynamic-search-filter-loader.service";
import { TelescopeService } from "@features/equipment/services/telescope.service";
import { CameraService } from "@features/equipment/services/camera.service";

export enum SearchAutoCompleteType {
  SUBJECT = "subject",
  TELESCOPE = "telescope",
  CAMERA = "camera",
  TELESCOPE_TYPE = "telescope_type",
  CAMERA_TYPE = "camera_type"
}

export interface SearchAutoCompleteItem {
  type: SearchAutoCompleteType;
  label: string;
  value?: any;
}

@Injectable({
  providedIn: "root"
})
export class SearchService extends BaseService {
  constructor(
    public readonly loadingService: LoadingService,
    public readonly translateService: TranslateService,
    public readonly equipmentApiService: EquipmentApiService,
    public readonly dynamicSearchFilterLoaderService: DynamicSearchFilterLoaderService,
    @Inject(SEARCH_FILTERS_TOKEN) public readonly allFiltersTypes: Type<SearchFilterComponentInterface>[],
    @Inject(AUTO_COMPLETE_ONLY_FILTERS_TOKEN)
    public readonly autoCompleteOnlyFiltersTypes: Type<SearchFilterComponentInterface>[],
    public readonly telescopeService: TelescopeService,
    public readonly cameraService: CameraService
  ) {
    super(loadingService);
  }

  instantiateFilterComponent(
    componentType: Type<SearchFilterComponentInterface>,
    value: any,
    filterContainer: ViewContainerRef
  ): ComponentRef<SearchFilterComponentInterface> {
    return this.dynamicSearchFilterLoaderService.loadComponent(
      componentType,
      value,
      filterContainer
    );
  }

  getFilterComponentTypeByKey(key: string): Type<SearchFilterComponentInterface> {
    return this.allFiltersTypes.find(filterType => ((filterType as any).key === key));
  }

  getKeyByFilterComponentType(componentType: Type<SearchFilterComponentInterface>): string {
    return (componentType as any).key;
  }

  getKeyByFilterComponentInstance(componentInstance: SearchFilterComponentInterface): string {
    return (componentInstance.constructor as any).key;
  }

  humanizeSearchAutoCompleteType(type: SearchAutoCompleteType): string {
    switch (type) {
      case SearchAutoCompleteType.SUBJECT:
        return this.translateService.instant("Subjects");
      case SearchAutoCompleteType.TELESCOPE:
        return this.translateService.instant("Telescopes & lenses");
      case SearchAutoCompleteType.CAMERA:
        return this.translateService.instant("Cameras");
      case SearchAutoCompleteType.TELESCOPE_TYPE:
        return this.translateService.instant("Telescope types");
      case SearchAutoCompleteType.CAMERA_TYPE:
        return this.translateService.instant("Camera types");
    }
  }

  autoCompleteSubjects$(query: string): Observable<SearchAutoCompleteItem[]> {
    const messierRange = Array.from({ length: 110 }, (_, i) => i + 1);
    const ngcRange = Array.from({ length: 7840 }, (_, i) => i + 1);
    const icRange = Array.from({ length: 5386 }, (_, i) => i + 1);
    const sh2Range = Array.from({ length: 313 }, (_, i) => i + 1);

    const subjects = [
      ...messierRange.map(i => ({
        type: SearchAutoCompleteType.SUBJECT,
        label: `M ${i}`
      })),
      ...ngcRange.map(i => ({
        type: SearchAutoCompleteType.SUBJECT,
        label: `NGC ${i}`
      })),
      ...icRange.map(i => ({
        type: SearchAutoCompleteType.SUBJECT,
        label: `IC ${i}`
      })),
      ...sh2Range.map(i => ({
        type: SearchAutoCompleteType.SUBJECT,
        label: `Sh2-${i}`
      }))
    ];

    const commonSubjects = [
      "47 Tuc Cluster",
      "Andromeda Galaxy",
      "Antennae Galaxies",
      "Barbell Nebula",
      "Barnard's Galaxy",
      "Barnard's Merope Nebula",
      "Beehive cluster",
      "Black Eye Galaxy",
      "Blue Snowball",
      "Bode's Galaxy",
      "Bubble Nebula",
      "Butterfly Cluster",
      "California Nebula",
      "Carina Nebula",
      "Cat's Eye Nebula",
      "Centaurus A",
      "Checkmark Nebula",
      "Christmas Tree Cluster",
      "Cigar Galaxy",
      "Cocoon Nebula",
      "Coddington's Nebula",
      "Coma Pinwheel",
      "Cone nebula",
      "Cork Nebula",
      "Crab Nebula",
      "Crescent Nebula",
      "Double cluster",
      "Dumbbell Nebula",
      "Eagle Nebula",
      "Eskimo Nebula",
      "Eta Car Nebula",
      "Evil Eye Galaxy",
      "Filamentary nebula",
      "Fireworks Galaxy",
      "Flame Nebula",
      "Flaming Star Nebula",
      "Gamma Cas nebula",
      "Gamma Cyg nebula",
      "Gem A",
      "Great Cluster in Hercules",
      "Great Orion Nebula",
      "Helix Nebula",
      "Hercules Globular Cluster",
      "Herschel's Jewel Box",
      "Hind's Variable Nebula",
      "Horsehead Nebula",
      "Hourglass Nebula",
      "Hubble's Nebula",
      "Hubble's variable neb",
      "Iris Nebula",
      "Jewel Box",
      "Kappa Crucis Cluster",
      "Lace-work nebula",
      "Lagoon Nebula",
      "Lambda Cen nebula",
      "Little Dumbbell",
      "Lobster Nebula",
      "Lower Sword",
      "Maia Nebula",
      "Mairan's Nebula",
      "Merope Nebula",
      "Monkey Head Nebula",
      "Needle Galaxy",
      "Network nebula",
      "North America Nebula",
      "Omega Centauri",
      "Omega nebula",
      "Omi Per Cloud",
      "Orion Nebula",
      "Owl Cluster",
      "Owl Nebula",
      "Pearl Cluster",
      "Pelican Nebula",
      "Pencil Nebula",
      "Perseus A",
      "Pin-wheel nebula",
      "Praesepe Cluster",
      "Ptolemy's Cluster",
      "Rho Oph Nebula",
      "Rim Nebula",
      "Ring Nebula",
      "Rosette Nebula",
      "Sculptor Filament",
      "Sculptor Galaxy",
      "Siamese Twins",
      "Silver Coin",
      "Small Magellanic Cloud",
      "Small Sgr Star Cloud",
      "Sombrero Galaxy",
      "Southern Pinwheel Galaxy",
      "Southern Pleiades",
      "Star Queen",
      "Stephan's Quintet",
      "Sunflower Galaxy",
      "Swan Nebula",
      "Tarantula Nebula",
      "Tejat Prior",
      "Tet Car Cluster",
      "The Eyes",
      "The Running Man Nebula",
      "The War and Peace Nebula",
      "The Witch Head Nebula",
      "Triangulum Galaxy",
      "Triangulum Pinwheel",
      "Trifid Nebula",
      "Upper Sword",
      "Veil Nebula",
      "Virgo Cluster Pinwheel",
      "Virgo Galaxy",
      "Whale Galaxy",
      "Whirlpool Galaxy",
      "Wild Duck Cluster",
      "Wishing Well Cluster",
      "Witch Head nebula",
      "chi Persei Cluster",
      "h Persei Cluster",
      "Omega Nebula"
    ];

    subjects.push(
      ...commonSubjects.map(label => ({
        type: SearchAutoCompleteType.SUBJECT,
        label
      }))
    );

    return new Observable<SearchAutoCompleteItem[]>(subscriber => {
      const normalizedQuery = query.replace(/\s+/g, "").toLowerCase();
      const filteredSubjects = subjects
        .filter(subject => subject.label.replace(/\s+/g, "").toLowerCase().includes(normalizedQuery))
        .map(subjects => ({ ...subjects, value: subjects.label }));
      subscriber.next(filteredSubjects);
      subscriber.complete();
    });
  }

  autoCompleteTelescopes$(query: string): Observable<SearchAutoCompleteItem[]> {
    return this.equipmentApiService.findAllEquipmentItems(EquipmentItemType.TELESCOPE, { query, limit: 10 }).pipe(
      map((response: PaginatedApiResultInterface<TelescopeInterface>) => {
        return response.results.map(telescope => {
          const label = `${telescope.brandName || this.translateService.instant("(DIY)")} ${telescope.name}`;
          const value = {
            id: telescope.id,
            name: label
          };

          return {
            type: SearchAutoCompleteType.TELESCOPE,
            label,
            value
          };
        });
      })
    );
  }

  autoCompleteCameras$(query: string): Observable<SearchAutoCompleteItem[]> {
    return this.equipmentApiService.findAllEquipmentItems(EquipmentItemType.CAMERA, { query, limit: 10 }).pipe(
      map((response: PaginatedApiResultInterface<CameraInterface>) => {
        return response.results.map(camera => {
          const label = `${camera.brandName || this.translateService.instant("(DIY)")} ${camera.name}`;
          const value = {
            id: camera.id,
            name: label
          };

          return {
            type: SearchAutoCompleteType.CAMERA,
            label,
            value
          };
        });
      })
    );
  }

  autoCompleteTelescopeTypes$(query: string): Observable<SearchAutoCompleteItem[]> {
    const humanizedTypes = Object.values(TelescopeType).map(type => ({
      type,
      humanized: this.telescopeService.humanizeType(type)
    }));

    const filteredTypes = humanizedTypes.filter(item =>
      item.humanized.toLowerCase().includes(query.toLowerCase())
    );

    const autoCompleteItems = filteredTypes.map(item => ({
      type: SearchAutoCompleteType.TELESCOPE_TYPE,
      label: item.humanized,
      value: item.type
    }));

    return of(autoCompleteItems);
  }

  autoCompleteCameraTypes$(query: string): Observable<SearchAutoCompleteItem[]> {
    const humanizedTypes = Object.values(CameraType).map(type => ({
      type,
      humanized: this.cameraService.humanizeType(type)
    }));

    const filteredTypes = humanizedTypes.filter(item =>
      item.humanized.toLowerCase().includes(query.toLowerCase())
    );

    const autoCompleteItems = filteredTypes.map(item => ({
      type: SearchAutoCompleteType.CAMERA_TYPE,
      label: item.humanized,
      value: item.type
    }));

    return of(autoCompleteItems);
  }
}