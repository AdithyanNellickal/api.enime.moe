import {
    CACHE_MANAGER, CacheInterceptor,
    Controller,
    Get, Inject,
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

@Controller("/proxy")
@UseInterceptors(EnimeCacheInterceptor)
@Injectable()
export default class ProxyController {

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, private readonly databaseService: DatabaseService, private readonly scraperService: ScraperService) {
    }

    @Get("/source/:id")
    @Throttle(10, 60)
    @NoCache()
    async sourceProxy(@Param() params, @Res() res) {
        const id = params.id.replace(/\.[^/.]+$/, "");

        const cacheKey = `proxy-source-${id}`;

        let cachedSource = await this.cacheManager.get(cacheKey);
        if (cachedSource) return res.redirect(302, cachedSource);

        const source = await this.databaseService.source.findUnique({
            where: {
                id: id
            }
        });

        if (!source) throw new NotFoundException("The source does not exist.");

        if (source.type === "DIRECT") { // No need to proxy the request, redirect to raw source directly
            return res.redirect(302, source.url);
        }

        const scraper = this.scraperService.scrapers.find(s => s.websiteMeta.id === source.websiteId);
        if (!scraper) throw new InternalServerErrorException("Cannot proxy this source, please contact administrators.");

        const rawSourceUrl = await scraper.getRawSource(source.url);
        await this.cacheManager.set(cacheKey, rawSourceUrl, { ttl: 1000 * 60 * 60 * 5 }); // 5 hour cache (actual expiry time is ~6 hours but just in case)

        return res.redirect(302, rawSourceUrl);
    }
}