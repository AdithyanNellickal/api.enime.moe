import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import ScraperModule from './scraper.module';
import GogoanimeScraper from './impl/gogoanime';
import ProxyService from '../proxy/proxy.service';

describe("Gogoanime Scraper", () => {
    let application: INestApplication;
    process.env.TESTING = String(true);

    beforeEach(async () => {
        application = await NestFactory.create(ScraperModule, new FastifyAdapter());
        await application.init();
    });

    it("Matching episodes", async () => {
        const scraper = new GogoanimeScraper(application.get(ProxyService));

        // TODO - Scraper logic and testing here
        console.log(await scraper.match("Lycoris Recoil"))
    });

})