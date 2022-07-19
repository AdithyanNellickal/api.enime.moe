import Scraper from '../scraper';
import * as cheerio from 'cheerio';
import { MatchEpisode } from '../../../types/global';

export default class GogoanimeScraper extends Scraper {

    async fetch(path: string) {
    }

    async match(title): Promise<MatchEpisode[]> {
        const response = this.get(`${this.url()}/search.html?keyword=${encodeURI(title)}}`, {}, true);

        const $ = cheerio.load(await (await response).text());

        console.log($.html())
        return [];
    }

    name(): string {
        return "Gogoanime";
    }

    url(): string {
        return "https://gogoanime.lu";
    }

}