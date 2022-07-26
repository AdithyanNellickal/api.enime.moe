import {
    CACHE_MANAGER, CacheInterceptor,
    Controller,
    Get, Header, Inject,
    Injectable, InternalServerErrorException,
    NotFoundException,
    Param, Res, UseInterceptors

} from '@nestjs/common';
import DatabaseService from '../database/database.service';
import { Throttle } from '@nestjs/throttler';
import ScraperService from '../scraper/scraper.service';
import { NoCache } from '../cache/no-cache.decorator';
import { Cache } from 'cache-manager';
import { EnimeCacheInterceptor } from '../cache/enime-cache.interceptor';
import { RawSource } from '../types/global';

@Controller("/proxy")
@Injectable()
export default class ProxyController {

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, private readonly databaseService: DatabaseService, private readonly scraperService: ScraperService) {
    }

    @Get("/source/:id/subtitle")
    @Throttle(10, 60)
    @NoCache()
    async sourceSubtitleProxy(@Param() params, @Res() res) {
        const id = params.id.replace(/\.[^/.]+$/, "");
        const rawSource = await this.getRawSource(id);

        return res.redirect(302, rawSource.subtitle);
    }

    @Get("/source/:id")
    @Throttle(10, 60)
    @NoCache()
    async sourceProxy(@Param() params, @Res() res) {
        const id = params.id.replace(/\.[^/.]+$/, "");
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

        const scraper = this.scraperService.scrapers.find(s => s.websiteMeta.id === source.websiteId);
        if (!scraper) throw new InternalServerErrorException("Cannot proxy this source, please contact administrators.");

        const rawSource = await scraper.getRawSource(source.url);
        if (!rawSource) throw new InternalServerErrorException("Cannot proxy this source, please contact administrators.");

        await this.cacheManager.set(cacheKey, JSON.stringify(rawSource), { ttl: 60 * 60 * 5 }); // 5 hour cache (actual expiry time is ~6 hours but just in case)

        return rawSource;
    }
}