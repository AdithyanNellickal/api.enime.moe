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
        application = await NestFactory.create(ScraperModule);
        // await application.init();
    });


    it("Scraper", async () => {
        console.log("Reached 1")
        // const scraper = new GogoanimeScraper(application.get(ProxyService));
        const scraper = new Zoro(application.get(ProxyService));

        const anime = await application.get(ScraperModule).matchAnime( {
            "native": "まちカドまぞく 2丁目",
            "romaji": "Machikado Mazoku: 2-Choume",
            "english": "The Demon Girl Next Door Season 2"
        }, scraper);

        console.log(anime);



        //console.log(await scraper.fetch("/komi-san-wa-comyushou-desu-2nd-season-17975"))
        //await scraper.fetch(anime.path, 1);
    }).timeout(0);

});