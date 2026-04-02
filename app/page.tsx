'use client'

import { useEffect, useRef } from "react";
import { useState } from "react";
import { generate, tags, type TagsResponse, pull, chat } from "./ollama";
import { MAX_CHAT_MESSAGES_COUNT } from "./constants";

export type Message = {
  content: string;
  role: "user" | "assistant";
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
  const [userContent, setUserContent] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [chatMode, setChatMode] = useState(true);

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

  async function exec() {
    if (chatMode) {
      return execChat();
    } else {
      return execGenerate();
    }
  }

  async function execGenerate() {
    const prompt = userContent.trim();
    const message: Message = { role: "user", content: prompt };

    setThinking(true);
    setUserContent('');
    addMessages(message);

    try {
      let response = '';

      for await (const result of await generate({ model, prompt })) {
        if (result.response?.length) {
          response += result.response;

          addMessages(message, { role: "assistant", content: response });
        }
      }
    } catch (error) {
      processError(error);
    } finally {
      setThinking(false);
    }
  }

  async function execChat() {
    const prompt = userContent.trim();
    const message: Message = { role: "user", content: prompt };

    setThinking(true);
    setUserContent('');
    addMessages(message);

    try {
      let response = '';

      for await (const result of await chat({ model, messages: messages.slice(-MAX_CHAT_MESSAGES_COUNT).concat({ role: 'user', content: prompt }) })) {
        if (result.message?.content) {
          response += result.message.content;

          addMessages(message, { role: "assistant", content: response });
        }
      }
    } catch (error) {
      processError(error);
    } finally {
      setThinking(false);
    }
  }

  async function execPull() {
    try {
      for await (const result of await pull(modelToPull.trim())) {
        if (result.completed != null && result.total != null) {
          setPullProgress(Math.max(0, Math.min(1, result.completed / result.total)));
        }
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
    <>
      <main className="flex-grow-1">

        <div className="container">
          {
            messages.length
              ? messages.map(({ role, content }, i) => <>
                <div className="row" key={i}>
                  <div className={`col ${role === 'assistant' ? '' : 'p-2 rounded-sm bg-gray-800'}`}>
                    <pre className="text-wrap">{content}</pre>
                  </div>
                </div>
              </>)
              : undefined
          }
          {
            thinking
              ? <div className="col"><ThinkingAnimation /></div>
              : undefined
          }
        </div >
      </main>

      <footer className="navbar navbar-dark bg-dark mt-auto">
        <div className="container-fluid justify-content-center">
          <span className="navbar-text me-2">Ollama-UI</span>
          <div className="input-group mb-3">
            <div className="input-group-text">
              <input className="form-check-input mt-0 me-2" id="dzadza" type="checkbox" checked={true} aria-label="Checkbox for following text input" />
              <label htmlFor="dzadza">Chat</label>
            </div>
            <select className="form-select" id="inputGroupSelect02" value={1}>
              <option>Choose...</option>
            </select>
            <input type="text" className="form-control w-50" placeholder="Recipient's username" aria-label="Recipient's username" aria-describedby="button-addon2" />
            <button className="btn btn-primary" type="button" id="button-addon2"><i className="bi bi-play-fill"></i></button>
          </div>
        </div>
      </footer>

      <form className="w-full" onSubmit={(event) => { event.preventDefault(); if (userContent?.length) { exec(); } }}>
        <div className="w-full mb-4 border border-default-medium rounded-base bg-neutral-secondary-medium shadow-xs">
          <div className="flex items-center justify-between px-3 py-2 border-b border-default-medium">
            <div className="flex flex-wrap items-center divide-default-medium sm:divide-x sm:rtl:divide-x-reverse">
              <div className="flex items-center space-x-1 rtl:space-x-reverse sm:pe-4">
                <input id="inline-checkbox" type="checkbox" checked={chatMode} className="w-4 h-4 border border-default-medium rounded-xs bg-neutral-secondary-medium focus:ring-2 focus:ring-brand-soft" onChange={(event) => setChatMode(event.target.checked)} />
                <label htmlFor="inline-checkbox" className="select-none ms-2 text-sm font-medium text-heading">Chat</label>
                <select id="models" className="block w-full px-3 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body" value={model} onChange={(ev) => setModel(ev.target.value)}>
                  {models.map((model) => <option className="dark:bg-black" value={model} key={model}>{model}</option>
                  )}
                </select>
                <input type="text" id="pullModel" className="bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block w-full px-2.5 py-2 shadow-xs placeholder:text-body" placeholder="Pull model" disabled={pullProgress !== 0} style={{ background: `linear-gradient(to right, #3b82f6 ${100 * pullProgress}%, transparent ${100 * pullProgress}%)` }} value={modelToPull} onChange={(ev) => setModelToPull(ev.target.value)} onKeyDown={(event) => event.key === 'Enter' && execPull()} />
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-neutral-secondary-medium rounded-b-base">
            <label htmlFor="userContent" className="sr-only">Send</label>
            <textarea id="userContent" rows={8} className="block w-full px-0 text-sm text-heading bg-neutral-secondary-medium border-0 focus:ring-0 placeholder:text-body" placeholder="Prompt" required onChange={(event) => setUserContent(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && userContent?.length && exec()} value={userContent}></textarea>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={thinking} style={{ cursor: thinking ? 'not-allowed' : 'pointer' }}>{thinking ? 'Thinking...' : 'Send'}</button>
      </form>
    </>
  );
}
