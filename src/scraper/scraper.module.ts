import { Logger, Module, OnModuleInit } from '@nestjs/common';
import ProxyService from '../proxy/proxy.service';
import DatabaseService from '../database/database.service';
import { BullModule, Process, Processor } from '@nestjs/bull';
import ScraperService from './scraper.service';
import InformationModule from '../information/information.module';
import { AnimeWebPage } from '../types/global';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import Scraper from './scraper';
import { transform } from '../helper/romaji';
import * as path from 'path';
import * as fs from 'fs';
import DatabaseModule from '../database/database.module';

@Module({
    imports: [BullModule.registerQueue({
        name: "scrape",
        processors: [fs.existsSync(path.join(__dirname, "scraper-processor.js")) ? path.join(__dirname, "scraper-processor.js") : path.join(__dirname, "scraper-processor.ts")]
    }), DatabaseModule, InformationModule],
    providers: [ScraperService, ProxyService]
})
export default class ScraperModule implements OnModuleInit {
    constructor() {
        if (!process.env.TESTING) dayjs.extend(utc);
    }

    async onModuleInit() {
        if (process.env.TESTING) return;
    }

    async matchAnime(title, scraper: Scraper): Promise<AnimeWebPage> {
        if (!("original" in title)) title.original = true;

        title.tries = title.tries++ || 1;

        let original = title.original, special = title.special;
        if (original) title.current = title.english || title.romaji;

        let matchedEntry = await scraper.match(title);

        if (!matchedEntry) {
            if (title.tries >= 50) throw new Error(`Anime matching for title ${title} resulted into a potential infinite loop, skipping this match to preserve the scraper functionality`);

            if (special) {
                if (title.english?.includes(":") || title.romaji?.includes(":")) {
                    let prefixEnglish = title.english?.split(":")[0];
                    let prefixRomaji = title.romaji?.split(":")[0];

                    if (title.current === prefixEnglish) {
                        title.current = prefixRomaji;
                    } else if (title.current === prefixRomaji) {
                        return undefined;
                    } else {
                        title.current = prefixEnglish;
                    }

                    title.original = false;

                    return this.matchAnime(title, scraper);
                }

                return undefined;
            }

            if (title.english !== title.romaji) {
                if ((title.current === title.english) && !!title.romaji) {
                    title.current = title.romaji;
                    title.original = false;

                    return this.matchAnime(title, scraper);
                }

                if ((title.current === title.romaji) && (title.current !== transform(title.romaji))) {
                    title.current = transform(title.romaji);

                    return this.matchAnime(title, scraper);
                }

                if (title.current === transform(title.romaji)) {
                    title.special = true;

                    return this.matchAnime(title, scraper);
                }
            }

            return undefined;
        }

        return matchedEntry;
    }
}