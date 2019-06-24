import * as request from "supertest";
import {Test} from "@nestjs/testing";
import {HttpStatus, INestApplication} from "@nestjs/common";
import {AppModule} from "../src/app.module";

describe("App (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    it("/ (GET)", () => {
        return request(app.getHttpServer())
            .get("/")
            .expect(HttpStatus.OK)
            .expect("[]");
    });
});
