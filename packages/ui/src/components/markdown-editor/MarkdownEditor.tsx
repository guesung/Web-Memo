"use client";

import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/kit/utils";
// prosemirror base styles - import before crepe styles
import "prosemirror-view/style/prosemirror.css";
// crepe theme styles
import "@milkdown/crepe/theme/frame/style.css";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "../../utils/cn";
import type { MarkdownEditorProps, MarkdownEditorRef } from "./types";

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor(
    {
      defaultValue = "",
      onChange,
      onBlur,
      onFocus,
      placeholder,
      readOnly = false,
      className,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);
    const isCreatingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        return crepeRef.current?.getMarkdown() ?? "";
      },
      setMarkdown: (markdown: string) => {
        crepeRef.current?.editor.action(replaceAll(markdown));
      },
      setReadOnly: (value: boolean) => {
        crepeRef.current?.setReadonly(value);
      },
    }));

    useLayoutEffect(() => {
      if (!containerRef.current || isCreatingRef.current) return;

      isCreatingRef.current = true;

      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue,
        features: {
          [Crepe.Feature.Placeholder]: !!placeholder,
        },
        featureConfigs: {
          [Crepe.Feature.Placeholder]: {
            text: placeholder ?? "",
          },
        },
      });

      // 이벤트 리스너 등록
      crepe.on((listener) => {
        listener.markdownUpdated((_, markdown) => {
          onChange?.(markdown);
        });

        listener.focus(() => {
          onFocus?.();
        });

        listener.blur(() => {
          onBlur?.();
        });
      });

      crepe.create().then(() => {
        crepeRef.current = crepe;
        isCreatingRef.current = false;

        if (readOnly) {
          crepe.setReadonly(true);
        }
      });

      return () => {
        if (crepeRef.current) {
          crepeRef.current.destroy();
          crepeRef.current = null;
        }
      };
    }, []);

    // readOnly 상태 변경 처리
    useEffect(() => {
      if (crepeRef.current) {
        crepeRef.current.setReadonly(readOnly);
      }
    }, [readOnly]);

    return (
      <div
        ref={containerRef}
        className={cn("markdown-editor", className)}
      />
    );
  }
);

export default MarkdownEditor;
