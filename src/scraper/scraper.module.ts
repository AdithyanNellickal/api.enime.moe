import { Logger, Module, OnModuleInit } from '@nestjs/common';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import fs from 'fs/promises';
import path from 'path';
import { BullModule, Process, Processor } from '@nestjs/bull';
import ScraperService from './scraper.service';
import { Job } from 'bull';
import Scraper from './scraper';

@Module({
    imports: [BullModule.registerQueue({
        name: "enime"
    })],
    providers: [ScraperService, DatabaseService, ProxyService]
})
@Processor("enime")
export default class ScraperModule implements OnModuleInit {
    importedScrapers: Scraper[] = [];

    constructor(private readonly proxyService: ProxyService, private readonly databaseService: DatabaseService) {
    }

    async onModuleInit() {
        if (process.env.TESTING) return;

        const files = (await fs.readdir(path.resolve(__dirname, "./impl"))).filter(file => {
            return path.extname(file).toLowerCase() === ".js" || path.extname(file).toLowerCase() === ".ts";
        });
        for (const file of files) {
            const { default: ScraperModule } = await import(path.resolve(__dirname, "./impl", file));

            this.importedScrapers.push(new ScraperModule(this.proxyService));
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

    @Process("scrape-anime-match")
    async scrape(job: Job<string>) {
        const id = job.data;

        const anime = await this.databaseService.anime.findUnique({
            where: {
                id
            }
        });
        
        if (!anime) {
            Logger.error(`Scraper queue detected an ID ${id} but its corresponding anime entry does not exist in the database. Skipping this job.`);
            return;
        }

        for (let scraper of this.importedScrapers) {
            let matchedEpisodes = scraper.match(anime.title);
            if (matchedEpisodes instanceof Promise) matchedEpisodes = await matchedEpisodes;

            for (let matchedEpisode of matchedEpisodes) {
                let scrapedEpisode = scraper.fetch(matchedEpisode.path);
                if (scrapedEpisode instanceof Promise) scrapedEpisode = await scrapedEpisode;

                const episode = await this.databaseService.episode.upsert({
                    where: {
                        number: scrapedEpisode.number
                    },
                    create: {
                        animeId: anime.id,
                        number: scrapedEpisode.number,
                        title: scrapedEpisode.title
                    },
                    update: {
                        ...(scrapedEpisode.title && {
                            title: scrapedEpisode.title
                        })
                    }
                });

                await this.databaseService.source.upsert({
                    where: {
                        url: scrapedEpisode.url
                    },
                    create: {
                        website: {
                          connect: { id: scraper.websiteMeta.id }
                        },
                        episode: {
                          connect: { id: episode.id }
                        },
                        url: scrapedEpisode.url,
                        resolution: scrapedEpisode.resolution,
                        format: scrapedEpisode.format
                    },
                    update: {}
                })
            }
        }
    }
}