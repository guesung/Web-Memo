import { cn } from '@extension/shared/utils';
import type { IframeHTMLAttributes } from 'react';

interface YoutubeEmbedProps extends IframeHTMLAttributes<HTMLIFrameElement> {
  embedId: string;
  isAutoPlay?: boolean;
}
export default function YoutubeEmbed({ embedId, className, isAutoPlay = false, ...props }: YoutubeEmbedProps) {
  return (
    <div className="relative h-0 overflow-hidden pb-[56.25%]">
      <iframe
        width="853"
        height="480"
        src={cn(`https://www.youtube.com/embed/${embedId}`, { '?autoplay=1': isAutoPlay })}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
        className={`absolute inset-x-0 h-full w-full ${className}`}
        {...props}
      />
    </div>
  );
}
