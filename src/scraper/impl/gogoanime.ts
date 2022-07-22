import Scraper from '../scraper';
import * as cheerio from 'cheerio';
import { AnimeWebPage, Episode, SourceType } from '../../types/global';
import * as CryptoJS from 'crypto-js';
import fetch from 'node-fetch';

// Credit to https://github.com/riimuru/gogoanime/blob/46edf3de166b7c5152919d6ac12ab6f55d9ed35b/lib/helpers/extractors/goload.js
export default class GogoanimeScraper extends Scraper {
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

    async generateEncryptAjaxParameters($, id) {
        const keys = await this.fetchKeys();
        let iv = keys.iv;
        let key = keys.key;

        const encryptedKey = CryptoJS.AES.encrypt(id, key, {
            iv: iv,
        });

        const script = $("script[data-name='episode']").data().value;
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

    async fetch(path: string, number: number): Promise<Episode> {
        let url = `${this.url()}${path}`;

        let response = this.get(url, {}, true);
        let $ = cheerio.load(await (await response).text());

        const movieId = $("#movie_id").attr("value");

        url = `https://ajax.gogo-load.com/ajax/load-list-episode?ep_start=${number}&ep_end=${number}&id=${movieId}`;
        response = this.get(url, {}, true);
        $ = cheerio.load(await (await response).text());

        const episodeUrl = $("a").attr("href");
        response = this.get(`${this.url()}${episodeUrl}`.replaceAll(" ", ""), {}, true);
        $ = cheerio.load(await (await response).text());

        let embedUrl = $("iframe").first().attr("src");
        const parsedEmbedUrl = new URL(`https://${embedUrl}`);

        response = this.get(parsedEmbedUrl.href, {
            Referer: episodeUrl
        }, true);

        const $$ = cheerio.load(await (await response).text());
        const params = await this.generateEncryptAjaxParameters(
            $$,
            parsedEmbedUrl.searchParams.get("id")
        );

        const fetchRes = await this.get(`${parsedEmbedUrl.protocol}//${parsedEmbedUrl.hostname}/encrypt-ajax.php?${params}`, {
                "X-Requested-With": "XMLHttpRequest",
            },
            true
        );

        const res = this.decryptEncryptAjaxResponse(await fetchRes.json());

        let source = res.source.length ? res.source[0] : res.source_bk[0];

        if (!source) return undefined;

        return {
            url: source.file,
            title: undefined,
            format: source.file.split(/[#?]/)[0].split('.').pop().trim(),
            referer: episodeUrl,
            type: SourceType.PROXY
        };
    }

    async match(t): Promise<AnimeWebPage> {
        let url = `${this.url()}/search.html?keyword=${encodeURI(t)}`;

        // Credit to https://github.com/AniAPI-Team/AniAPI/blob/main/ScraperEngine/resources/gogoanime.py
        const response = this.get(url, {}, true);
        const $ = cheerio.load(await (await response).text());

        const showElement = $(".last_episodes > ul > li").first();

        if (!showElement) return undefined;

        let link = $(showElement).find(".name > a");
        let title = link.attr("title"), path = link.attr("href");

        return {
            title: title,
            path: path
        };
    }

    name(): string {
        return "Gogoanime";
    }

    url(): string {
        return "https://gogoanime.lu";
    }

}