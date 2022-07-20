import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export default class ScraperService {
    constructor(@InjectQueue("enime") private readonly queue: Queue) {
    }

    async queueToScrape(id: string) {
        await this.queue.add("scrape-anime-match", id);
    }
}