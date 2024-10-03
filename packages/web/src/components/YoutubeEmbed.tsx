import { IframeHTMLAttributes } from 'react';

interface YoutubeEmbedProps extends IframeHTMLAttributes<HTMLIFrameElement> {
  embedId: string;
  isAutoPlay?: boolean;
}
export default function YoutubeEmbed({ embedId, className, isAutoPlay = false, ...props }: YoutubeEmbedProps) {
  return (
    <div className="overflow-hidden relative h-0 pb-[56.25%]">
      <iframe
        width="853"
        height="480"
        src={`https://www.youtube.com/embed/${embedId}${isAutoPlay ? '?autoplay=1' : ''}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
        className={`absolute inset-x-0 h-full w-full ${className}`}
        {...props}
      />
    </div>
  );
}
