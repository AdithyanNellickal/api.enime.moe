import Scraper from '../scraper';
import * as cheerio from 'cheerio';
import * as similarity from 'string-similarity';

export default class Zoro extends Scraper {
    async fetch(path: string, number: number) {
        return undefined;
    }

    async match(t) {
        let url = `${this.url()}/search?keyword=${decodeURIComponent(t.english || t.romaji)}`;

        const response = this.get(url, {}, true);
        const $ = cheerio.load(await (await response).text());

        const results = [];

        $(".film_list-wrap > div.flw-item").each((i, el) => {
            const title = $(el).find(".film-name").text();
            const url = $(el).find(".film-name > a").attr("href");

            const parsedUrl = new URL(this.url() + url);
            parsedUrl.searchParams.delete("ref");

            results.push({
                title: title,
                url: parsedUrl.pathname
            });
        });

        // Zoro.to has a weird search that it's not ranked exactly by relevance. So what we're going to do here is to find all results from first page (relevance based)
        // then after that, find the best match entry based on both english and romaji title
        // However, if both matches have <90% similarity then the match is probably a failure
        let bestResult = similarity.findBestMatch(t.english || t.romaji, results.map(r => r.title));
        if (bestResult.bestMatch.rating < 0.9) {
            bestResult = similarity.findBestMatch(t.english, results.map(r => r.title));

            if (bestResult.bestMatch.rating < 0.9) return undefined;
        }

        return results.find(r => r.title === bestResult.bestMatch.target); // Can't possibly be undefined..
    }

    name(): string {
        return "zoro";
    }

    url(): string {
        return "https://zoro.to";
    }
}