import { testBrand, testMount } from "../../../support/commands/equipment-item-browser-utils";

context("Equipment", () => {
  beforeEach(() => {
    cy.server();
    cy.setupInitializationRoutes();
    cy.setupEquipmentDefaultRoutes();
  });

  context("Explorer", () => {
    context("Select existing", () => {
      it("should select existing item", () => {
        cy.login();
        cy.visitPage("/equipment/explorer/mount");

        cy.route("GET", "**/api/v2/equipment/mount/?q=*", {
          count: 1,
          next: null,
          previous: null,
          results: [testMount]
        }).as("findMounts");

        cy.route("GET", "**/api/v2/equipment/mount/?page=*", {
          count: 1,
          next: null,
          previous: null,
          results: [testMount]
        }).as("getMounts");

        cy.route("GET", "**/api/v2/equipment/brand/1/", testBrand).as("getBrand");

        cy.ngSelectType("#equipment-item-field", "Test");
        cy.wait("@findMounts");
        cy.wait("@getBrand");

        cy.ngSelectShouldHaveOptionsCount("#equipment-item-field", 2);
        cy.ngSelectOptionNumberSelectorShouldContain(
          "#equipment-item-field",
          1,
          "astrobin-equipment-item-summary .label strong",
          "Test brand"
        );
        cy.ngSelectOptionNumberSelectorShouldContain(
          "#equipment-item-field",
          1,
          "astrobin-equipment-item-summary .label",
          "Test"
        );

        cy.ngSelectOptionClick("#equipment-item-field", 1);
        cy.ngSelectValueShouldContain("#equipment-item-field", "Test brand Test");
      });

      it("should update the URL with ID and slug", () => {
        cy.url().should("include", `/equipment/explorer/mount/${testMount.id}/test-brand-test`);
      });

      it("should show the item", () => {
        cy.get(".card astrobin-equipment-item-summary .label strong")
          .contains("Test brand")
          .should("be.visible");
        cy.get(".card astrobin-equipment-item-summary .label")
          .contains("Test")
          .should("be.visible");
      });
    });
  });
});