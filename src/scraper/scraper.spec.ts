import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import ScraperModule from './scraper.module';
import GogoanimeScraper from './impl/gogoanime';
import ProxyService from '../proxy/proxy.service';
import Zoro from './impl/zoro';

describe("Scraper Test", function () {
    this.timeout(60000);

    let application: INestApplication;
    process.env.TESTING = String(true);

    beforeEach(async () => {
        application = await NestFactory.create(ScraperModule, new FastifyAdapter());
        await application.init();
    });

    /*
    it("Gogoanime Scraper", async () => {
        const scraper = new GogoanimeScraper(application.get(ProxyService));

        const anime = await scraper.match("Lycoris Recoil");

        await scraper.fetch(anime.path, 1);
    }).timeout(0);

     */

    it("Zoro.to Scraper", async () => {
        const scraper = new Zoro(application.get(ProxyService));

        // TODO - Scraper logic and testing here
        const anime = await scraper.match({
            english: "Attack on Titan Season 2",
            romaji: "Shingeki no Kyojin 2"
        });

        console.log(anime)
        // await scraper.fetch(anime.path, 1);
    });
});