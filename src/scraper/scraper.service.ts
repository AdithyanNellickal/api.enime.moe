import { Injectable, OnModuleInit } from '@nestjs/common';
import Scraper from './scraper';
import { promises as fs } from 'fs';
import * as path from 'path';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';

@Injectable()
export default class ScraperService implements OnModuleInit {
    private importedScrapers: Scraper[] = [];

    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService) {

    }

    async onModuleInit() {
        const files = (await fs.readdir(path.resolve(__dirname, "./impl"))).filter(file => {
            return path.extname(file).toLowerCase() === ".js" || path.extname(file).toLowerCase() === ".ts";
        });
        for (const file of files) {
            const { default: ScraperModule } = await import(path.resolve(__dirname, "./impl", file));

            const scraper = new ScraperModule(this.proxyService);

            if (scraper.enabled) this.importedScrapers.push(scraper);
        }

        for (const scraper of this.importedScrapers) {
            const website = await this.databaseService.website.upsert({
                where: {
                    url: scraper.url()
                },
                create: {
                    url: scraper.url(),
                    locale: scraper.locale(),
                    name: scraper.name()
                },
                update: {}
            });

            scraper.websiteMeta = {
                id: website.id
            }
        }
    }

    public get scrapers() {
        return this.importedScrapers;
    }
}