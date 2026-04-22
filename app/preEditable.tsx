import { useEffect, useRef } from "react";

export function PreEditable(
    {
        className,
        placeholder,
        value,
        onChange,
        disabled,
        onEnter,
    }: {
        className?: string | undefined;
        placeholder?: string | undefined;
        value: string;
        disabled?: boolean;
        onChange: (value: string) => void;
        onEnter?: (controlDown: boolean, shiftDown: boolean, altDown: boolean) => boolean;
    }
) {
    const preRef = useRef<HTMLPreElement>(null);
    const focus = useRef<boolean>(false);

    useEffect(() => {
        if (preRef.current) {
            if (!focus.current && value === '' && placeholder?.length) {
                preRef.current.innerText = placeholder;
            } else if (preRef.current.innerText !== value) {
                preRef.current.innerText = value ?? placeholder ?? '';
            }
        }
    }, [value, placeholder]);

    return (
        <div className={`form-control p-2 ${className?.length ? className : ''}`}>
            <pre
                ref={preRef}
                className={`m-0 whitespace-prewrap ${/^\s*$/.test(value) ? 'text-body-secondary' : ''}`}
                contentEditable={!disabled}
                aria-multiline="true"
                style={{ outline: "none" }}
                onInput={() => { if (preRef.current) { onChange?.(preRef.current.innerText); } }}
                onFocus={() => { focus.current = true; if (preRef.current && preRef.current.innerText === placeholder) { preRef.current.innerText = ''; } }}
                onBlur={() => { focus.current = false; if (preRef.current && /^\s*$/.test(preRef.current.innerText)) { preRef.current.innerText = placeholder ?? ''; } }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        if (onEnter?.(e.ctrlKey, e.shiftKey, e.altKey)) {
                            e.preventDefault();
                        }
                    }
                }}
            />
        </div>
    );
}
