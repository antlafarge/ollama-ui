'use client'

import { useEffect, useRef } from "react";
import { useState } from "react";
import { generate, tags, type TagsResponse, pull } from "./ollama";

export type Message = {
  message: string;
  ai?: boolean;
};

function ThinkingAnimation() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCount(((count + 1) % 4));
    }, 300);

    return () => clearInterval(intervalId);
  });

  return <>{count ? new Array(count).fill('.').join('') : <>&nbsp;</>}</>;
}

export default function Home() {
  const shouldGetModels = useRef(true);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>('');
  const [modelToPull, setModelToPull] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  function addMessages(...newMessages: Message[]) {
    setMessages(messages.concat(newMessages));
  }

  function processError(error: unknown) {
    console.error(error);
    alert(error);
  }

  function processTags(result: TagsResponse) {
    const newModels = result.models.map((model) => model.name);

    setModels(newModels);

    if (!model.length && newModels.length) {
      setModel(newModels[0]);
    }
  }

  async function execGenerate() {
    const promptMessage = { message: prompt.trim() };

    setThinking(true);
    setPrompt('');
    addMessages(promptMessage);

    try {
      let response = '';

      for await (const result of generate({ prompt, model })) {
        response += result.response;

        addMessages(promptMessage, { message: response, ai: true });
      }
    } catch (error) {
      processError(error);
    } finally {
      setThinking(false);
    }
  }

  async function execPull() {
    try {
      for await (const result of pull(modelToPull.trim())) {
        setPullProgress(Math.max(0, Math.min(1, result.completed / result.total)));
      }

      shouldGetModels.current = true;

      setPullProgress(0);
    } catch (error) {
      processError(error);
    }
  }

  useEffect(() => {
    if (shouldGetModels.current) {
      shouldGetModels.current = false;

      tags()
        .then(processTags)
        .catch(processError);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col w-full items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Ollama-ui
          </h1>
          {
            messages.length
              ? messages.map(({ message, ai }, i) => <div key={i} className={`${ai ? '' : 'p-2 rounded-sm bg-gray-800'}`}>
                <pre className="text-wrap">{message}</pre>
              </div>)
              : undefined
          }
          {
            thinking
              ? <ThinkingAnimation />
              : undefined
          }
          <form className="w-full" onSubmit={(event) => { event.preventDefault(); execGenerate(); }}>
            <div className="w-full mb-4 border border-default-medium rounded-base bg-neutral-secondary-medium shadow-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-default-medium">
                <div className="flex flex-wrap items-center divide-default-medium sm:divide-x sm:rtl:divide-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse sm:pe-4">
                    {/* <label htmlFor="models" className="block mb-2.5 text-sm font-medium text-heading">Select an option</label> */}
                    <select id="models" className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body" value={model} onChange={(ev) => setModel(ev.target.value)}>
                      {models.map((model) => <option value={model} key={model}>{model}</option>
                      )}
                    </select>
                    <input type="text" id="pullModel" className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" placeholder="Pull model" disabled={pullProgress !== 0} style={{ background: `linear-gradient(to right, #3b82f6 ${100 * pullProgress}%, transparent ${100 * pullProgress}%)` }} value={modelToPull} onChange={(ev) => setModelToPull(ev.target.value)} onKeyDown={(event) => event.key === 'Enter' && execPull()} />
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 bg-neutral-secondary-medium rounded-b-base">
                <label htmlFor="prompt" className="sr-only">Send</label>
                <textarea id="prompt" rows={8} className="block w-full px-0 text-sm text-heading bg-neutral-secondary-medium border-0 focus:ring-0 placeholder:text-body" placeholder="Prompt" required onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && execGenerate()} value={prompt}></textarea>
              </div>
            </div>
            <button type="submit" className="text-white bg-brand box-border border border-transparent hover:bg-brand-strong focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none" disabled={thinking} style={{ cursor: thinking ? 'not-allowed' : 'pointer' }}>{thinking ? 'Thinking...' : 'Send'}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
