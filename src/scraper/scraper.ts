import ProxyService from '../proxy/proxy.service';
import fetch from 'node-fetch';
import { Episode, AnimeWebPage, WebsiteMeta, RawSource } from '../types/global';
export const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36';

export default abstract class Scraper {
    public infoOnly = false;
    public enabled = false;
    public subtitle = false;
    public consumetServiceUrl = undefined;
    public priority = -1;

    public websiteMeta: WebsiteMeta = undefined;

    constructor(private readonly proxyService: ProxyService) {}

    abstract name(): string;

    abstract url(): string;

    locale() {
        return "en_US";
    }

    abstract match(title): AnimeWebPage | Promise<AnimeWebPage>;

    abstract fetch(path: string, number: number, endNumber: number | undefined): Episode | Promise<Episode> | Promise<Episode[]> | Episode[];

    async getSourceConsumet(sourceUrl: string | URL): Promise<RawSource> {
        return undefined;
    }

    async getRawSource(sourceUrl: string | URL, referer = undefined): Promise<RawSource> {
        return undefined;
    }

    async get(url, headers = {}, proxy = false) {
        let agent = undefined;

        if (proxy && process.env.WEBSHARE_API_KEY?.length > 0) {
            agent = await this.proxyService.getProxyAgent();
        }

        return fetch(url, {
            ...(proxy && {
                agent: agent
            }),
            headers: {
                ...headers,
                "User-Agent": USER_AGENT
            }
        });
    }

    async post(url, headers = {}, body: any = undefined, proxy = false) {
        let agent = undefined;

        if (proxy) {
            agent = await this.proxyService.getProxyAgent();
        }

        return fetch(url, {
            ...(proxy && {
                agent: agent
            }),
            method: "POST",
            headers: headers,
            body: body
        });
    }

}