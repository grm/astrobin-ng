import { testBrand, testSoftware } from "../../../support/commands/equipment-item-browser-utils";

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
        cy.visitPage("/equipment/explorer/software");

        cy.route("GET", "**/api/v2/equipment/software/?q=*", {
          count: 1,
          next: null,
          previous: null,
          results: [testSoftware]
        }).as("findSoftwareItems");

        cy.route("GET", "**/api/v2/equipment/software/?page=*", {
          count: 1,
          next: null,
          previous: null,
          results: [testSoftware]
        }).as("getSoftwareItems");

        cy.route("GET", "**/api/v2/equipment/brand/1/", testBrand).as("getBrand");

        cy.ngSelectType("#equipment-item-field", "Test");
        cy.wait("@findSoftwareItems");
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
        cy.url().should("include", `/equipment/explorer/software/${testSoftware.id}/test-brand-test`);
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