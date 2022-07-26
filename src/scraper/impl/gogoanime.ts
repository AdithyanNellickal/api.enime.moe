import Scraper, { USER_AGENT } from '../scraper';
import * as cheerio from 'cheerio';
import { AnimeWebPage, Episode, SourceType } from '../../types/global';
import * as CryptoJS from 'crypto-js';
import fetch from 'node-fetch';
import * as similarity from 'string-similarity';
import { transform } from '../../helper/romaji';

// Credit to https://github.com/riimuru/gogoanime/blob/46edf3de166b7c5152919d6ac12ab6f55d9ed35b/lib/helpers/extractors/goload.js
export default class GogoanimeScraper extends Scraper {
    override enabled = true;
    override infoOnly = false;

    ENCRYPTION_KEYS_URL =
        "https://raw.githubusercontent.com/justfoolingaround/animdl-provider-benchmarks/master/api/gogoanime.json";

    keys = undefined;

    async fetchKeys() {
        if (this.keys) return this.keys;

        const response = await fetch(this.ENCRYPTION_KEYS_URL);
        const res = await response.json();
        return this.keys = {
            iv: CryptoJS.enc.Utf8.parse(res.iv),
            key: CryptoJS.enc.Utf8.parse(res.key),
            second_key: CryptoJS.enc.Utf8.parse(res.second_key),
        };
    }

    async generateEncryptAjaxParameters(text, id) {
        const keys = await this.fetchKeys();
        let iv = keys.iv;
        let key = keys.key;

        const encryptedKey = CryptoJS.AES.encrypt(id, key, {
            iv: iv,
        });

        const script = text.match(/<script type="text\/javascript" src="[^"]+" data-name="episode" data-value="[^"]+"><\/script>/)[0].match(/data-value="[^"]+"/)[0].replace(/(data-value=)?"/, "");
        const token = CryptoJS.AES.decrypt(script, key, {
            iv: iv,
        }).toString(CryptoJS.enc.Utf8);

        return `id=${encryptedKey}&alias=${id}&${token}`;
    }

    decryptEncryptAjaxResponse(obj) {
        const decrypted = CryptoJS.enc.Utf8.stringify(
            CryptoJS.AES.decrypt(obj.data, this.keys.second_key, {
                iv: this.keys.iv,
            })
        );
        return JSON.parse(decrypted);
    }

    override async getRawSource(sourceUrl, referer) {
        const url = sourceUrl instanceof URL ? sourceUrl : new URL(sourceUrl);

        let response = await this.get(url.href, {
            Referer: referer
        }, false);

        const params = await this.generateEncryptAjaxParameters(
            await response.text(),
            url.searchParams.get("id")
        );

        const fetchRes = await this.get(`${url.protocol}//${url.hostname}/encrypt-ajax.php?${params}`, {
                "X-Requested-With": "XMLHttpRequest",

            },
            false
        );

        const res = this.decryptEncryptAjaxResponse(await fetchRes.json());

        let source = res.source.length ? res.source[0] : res.source_bk[0];

        if (!source) return undefined;

        return {
            video: source.file,
            subtitle: undefined
        };
    }

    async fetch(path: string, startNumber: number, endNumber: number): Promise<Episode[]> {
        let url = `${this.url()}${path}`;

        let response = this.get(url, {}, false);
        let $ = cheerio.load(await (await response).text());

        const movieId = $("#movie_id").attr("value");

        url = `https://ajax.gogo-load.com/ajax/load-list-episode?ep_start=${startNumber}&ep_end=${endNumber}&id=${movieId}`;
        response = this.get(url, {}, false);
        $ = cheerio.load(await (await response).text());

        const episodesSource = [];

        $("#episode_related > li").each((i, el) => {
            episodesSource.push({
                number: parseInt($(el).find(`div.name`).text().replace("EP ", "")),
                url: `${this.url()}${$(el).find(`a`).attr('href')?.trim()}`,
            });
        });

        const episodesMapped = [];

        for (let episode of episodesSource) {
            if (!episode.url) continue;

            let embedResponse = this.get(episode.url, {}, false);
            let $$ = cheerio.load(await (await embedResponse).text());

            let embedUrl = $$("iframe").first().attr("src");

            if (!embedUrl) continue;

            episodesMapped.push({
                ...episode,
                url: `https:${embedUrl}`,
                title: undefined,
                format: "m3u8",
                referer: episode.url,
                type: SourceType.PROXY
            })
        }

        return episodesMapped;
    }

    async match(t): Promise<AnimeWebPage> {
        let url = `${this.url()}/search.html?keyword=${encodeURIComponent(t.current)}`;

        // Credit to https://github.com/AniAPI-Team/AniAPI/blob/main/ScraperEngine/resources/gogoanime.py
        let response = this.get(url, {}, false);
        let $ = cheerio.load(await (await response).text());

        let showElement = $(".last_episodes > ul > li").first();

        if (!showElement.length) return undefined;

        let link = $(showElement).find(".name > a");
        let title = link.attr("title"), path = link.attr("href");

        // Bruh..
        let pass = false;
        if (!title) return undefined;

        let cleanedTitle = this.clean(title)

        if (t.english && t.english.toLowerCase() === title.toLowerCase()) pass = true;
        if (t.romaji && t.romaji.toLowerCase() === title.toLowerCase()) pass = true;

        if (t.english && similarity.compareTwoStrings(t.english.toLowerCase(), cleanedTitle.toLowerCase()) >= 0.8) pass = true;
        if (t.romaji && similarity.compareTwoStrings(t.romaji.toLowerCase(), cleanedTitle.toLowerCase()) >= 0.8) pass = true;
        if (!t.original && t.current && similarity.compareTwoStrings(t.current.toLowerCase(), cleanedTitle.toLowerCase()) >= 0.8) pass = true;

        if (!pass) return undefined;

        return {
            title: title,
            path: path
        };
    }
    
    clean(title) {
        return title.replaceAll(/(th|rd|nd|st) (Season)/gmi, "").replaceAll(/\([^\(]*\)$/gmi, "").trimEnd();
    }

    name(): string {
        return "Gogoanime";
    }

    url(): string {
        return "https://gogoanime.lu";
    }

}