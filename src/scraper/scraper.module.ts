import { Module, OnModuleInit } from '@nestjs/common';
import GogoanimeScraper from './impl/gogoanime';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import fs from 'fs/promises';
import path from 'path';

@Module({
    imports: [],
    providers: [DatabaseService, ProxyService]
})
export default class ScraperModule implements OnModuleInit {
    importedScrapers = [];

    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService) {
    }

    async onModuleInit() {
        const files = await fs.readdir(path.resolve(__dirname, "./impl"));
        for (const file of files) {
            const { default: ScraperModule } = await import(path.resolve(__dirname, "./impl", file));

            this.importedScrapers.push(new ScraperModule(this.proxyService));
        }

        for (const scraper of this.importedScrapers) {
            await this.databaseService.website.upsert({
                where: {
                    url: scraper.url()
                },
                create: {
                    url: scraper.url(),
                    locale: scraper.locale(),
                    name: scraper.name()
                },
                update: {}
            })
            console.log(await scraper.match("Lycoris Recoil"))
        }
    }

}