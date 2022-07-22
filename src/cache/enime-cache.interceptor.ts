import { CacheInterceptor, ExecutionContext } from '@nestjs/common';

export class EnimeCacheInterceptor extends CacheInterceptor {
    protected isRequestCacheable(context: ExecutionContext): boolean {
        const http = context.switchToHttp();
        const request = http.getRequest();

        const ignoreCaching: boolean = this.reflector.get(
            "ignoreCaching",
            context.getHandler(),
        );

        if (ignoreCaching) return false;

        return request.method === "GET";
    }
}