import {
    CACHE_MANAGER, CacheInterceptor,
    Controller,
    Get, Header, Inject,
    Injectable, InternalServerErrorException, Logger,
    NotFoundException,
    Param, Res, UseInterceptors

} from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Throttle } from '@nestjs/throttler';
import ScraperService from '../scraper/scraper.service';
import { NoCache } from '../cache/no-cache.decorator';
import { Cache } from 'cache-manager';
import fetch from 'node-fetch';
import { RawSource } from '../types/global';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller("/proxy")
@Injectable()
@ApiExcludeController()
export default class ProxyController {

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, private readonly databaseService: DatabaseService, private readonly scraperService: ScraperService) {
    }

    @Get("/source/:id/subtitle")
    @Throttle(10, 60)
    @NoCache()
    async sourceSubtitleProxy(@Param("id") id, @Res() res) {
        id = id.replace(/\.[^/.]+$/, "");
        const rawSource = await this.getRawSource(id);

        return res.redirect(302, rawSource.subtitle);
    }

    @Get("/source/:id")
    @Throttle(10, 60)
    @NoCache()
    async sourceProxy(@Param("id") id, @Res() res) {
        id = id.replace(/\.[^/.]+$/, "");
        const rawSource = await this.getRawSource(id);

        return res.redirect(302, rawSource.video);
    }

    async getRawSource(id): Promise<RawSource> {
        const cacheKey = `proxy-source-${id}`;

        let cachedSource = await this.cacheManager.get(cacheKey);
        if (cachedSource) return JSON.parse(<string>cachedSource);

        const source = await this.databaseService.source.findUnique({
            where: {
                id: id
            }
        });

        if (!source) throw new NotFoundException("The source does not exist.");

        if (source.type === "DIRECT") { // No need to proxy the request, redirect to raw source directly
            return {
                video: source.url
            };
        }

        const scraper = (await this.scraperService.scrapers()).find(s => s.websiteMeta.id === source.websiteId);
        if (!scraper) throw new InternalServerErrorException("Cannot proxy this source, please contact administrators.");

        let rawSource = undefined;
        const url = source.referer ? new URL(source.referer.replaceAll("//", "/")) : undefined;

        try {
            rawSource = await scraper.getRawSource(source.url, url?.href);
        } catch (e) {
            rawSource = scraper.getSourceConsumet(url || source.url);
            Logger.error(`Error occurred while trying to fetch source ID ${source.id}, falling back to Consumet service`, e);

            if (!rawSource) throw new InternalServerErrorException("Cannot proxy this source, please contact administrators.");
        }

        await this.cacheManager.set(cacheKey, JSON.stringify(rawSource), { ttl: 60 * 60 * 4 }); // 4 hour cache (actual expiry time is ~6 hours but just in case)

        return rawSource;
    }
}