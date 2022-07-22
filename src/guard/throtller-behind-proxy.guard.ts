import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
    protected getTracker(req: Record<string, any>): string {
        // See https://github.com/nginx-proxy/nginx-proxy/issues/130#issuecomment-496466841 for more info
        if (process.env.PRODUCTION) return req.headers["cf-connecting-ip"];

        return req.ips.length ? req.ips[0] : req.ip;
    }
}