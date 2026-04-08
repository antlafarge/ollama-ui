'use client'

import { useEffect, useRef } from "react";
import { useState } from "react";
import { generate, tags, type TagsResponse, pull, chat, deleteModel } from "./ollama";
import { MAX_CHAT_MESSAGES_COUNT } from "./constants";
import PreEditable from "./preEditable";

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
  const [tagsResponse, setTagsResponse] = useState<TagsResponse | undefined>(undefined);
  const [model, setModel] = useState<string>('');
  const [modelToPull, setModelToPull] = useState<string>('');
  const [prompt, setPrompt] = useState('');
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

  async function exec() {
    if (chatMode) {
      return execChat();
    } else {
      return execGenerate();
    }
  }

  async function execGenerate() {
    const promptTrimmed = prompt.trim();

    if (!prompt.length) {
      return;
    }

    const message: Message = { role: "user", content: promptTrimmed };

    setThinking(true);
    setPrompt('');
    addMessages(message);

    try {
      let response = '';

      for await (const result of await generate({ model, prompt: promptTrimmed })) {
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
    const promptTrimmed = prompt.trim();

    if (!prompt.length) {
      return;
    }

    const message: Message = { role: "user", content: promptTrimmed };

    setThinking(true);
    setPrompt('');
    addMessages(message);

    try {
      let response = '';

      for await (const result of await chat({ model, messages: messages.slice(-MAX_CHAT_MESSAGES_COUNT).concat({ role: 'user', content: prompt }) })) {
        if (result.message?.content) {
          response += result.message.content;
          response = response.trim();

          addMessages(message, { role: 'assistant', content: response });
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

      setPullProgress(1);
      setTagsResponse(undefined);
    } catch (error) {
      processError(error);
    }
  }

  async function execDelete() {
    try {
      await deleteModel(model.trim());

      shouldGetModels.current = true;

      setTagsResponse(undefined);
    } catch (error) {
      processError(error);
    }
  }

  useEffect(() => {
    if (!tagsResponse && shouldGetModels.current) {
      shouldGetModels.current = false;

      tags()
        .then((result) => {
          setTagsResponse(result);

          const modelNotFound = !result.models.find((curModel) => curModel.name === model);

          if ((!model.length || modelNotFound) && result.models.length) {
            const modelStored = localStorage.getItem('model');
            const modelToUse = result.models.find((curModel) => curModel.name === modelStored)?.name ?? result.models[0].name;

            setModel(modelToUse);

            if (modelStored !== modelToUse) {
              localStorage.setItem('model', modelToUse);
            }
          }
        })
        .catch(processError);
    }
  }, [tagsResponse, model]);

  return (
    <>
      <main className="flex-grow-1 mb-5 pb-5">
        <div className="container">
          {
            messages.length
              ?
              messages.map(({ role, content }, i) =>
                <div className="row mt-2" key={i}>
                  <div className={`col ${role === 'assistant' ? '' : 'rounded-sm bg-gray-800'}`}>
                    <div className={`alert ${role === 'user' ? 'alert-primary' : 'alert-secondary'} mb-0`} role="alert">
                      <pre className="m-0 whitespace-prewrap">{content}</pre>
                    </div>
                  </div>
                </div>
              )
              : undefined
          }
          {
            thinking
              ?
              <div className="row mt-2">
                <div className="col">
                  <div className="alert alert-info" role="alert">
                    <ThinkingAnimation />
                  </div>
                </div>
              </div>
              : undefined
          }
        </div >
      </main>

      <footer className="fixed-bottom navbar mt-auto" data-bs-theme="light">
        <div className="container-fluid justify-content-center">
          <div className="input-group dropup mb-1">
            <button className="btn btn-outline-primary bg-white dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">{model ?? 'Ollama-UI'} </button>
            <ul className="dropdown-menu">
              <li><a className="dropdown-item text-primary" href="https://hub.docker.com/r/antlafarge/ollama-ui" target="_blank"><strong>Ollama-UI</strong></a></li>
              <li><hr className="dropdown-divider" /></li>
              <li><a className="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#pullModelModal"><i className="bi bi-download"></i> Pull a new model</a></li>
              <li><hr className="dropdown-divider" /></li>
              <form className="px-3 py-1">
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" style={{cursor: "pointer"}} id="checkbox-chat" checked={chatMode} aria-label="Checkbox for following text input" onChange={(event) => setChatMode(event.target.checked)} />
                  <label className="form-check-label" htmlFor="checkbox-chat" style={{cursor: "pointer"}}>Chat</label>
                </div>
                <div className="mt-2">
                  <div className="input-group">
                    <select className="form-control form-select" id="models" value={model} onChange={(ev) => { setModel(ev.target.value); localStorage.setItem('model', ev.target.value); }}>
                      {tagsResponse?.models.map(({ name }) => <option value={name} key={name}>{name}</option>
                      )}
                    </select>
                    <button className="btn btn-outline-danger border" type="button" id="button-addon2" onClick={execDelete}><i className="bi bi-trash3-fill"></i></button>
                  </div>
                </div>
              </form>
              <li><a className="dropdown-item" href="#"><i className="bi bi-upload"></i> Load a file</a></li>
            </ul>
            <PreEditable
              className="border-primary"
              placeholder="Prompt"
              value={prompt}
              onChange={setPrompt}
              onEnter={(c, s, a) => { if (!c && !s && !a && !thinking) { exec(); } return !s; }}
            />
            <button className="btn btn-outline-primary bg-white" type="button" id="button-addon2" disabled={thinking} onClick={() => exec()}><i className="bi bi-play-fill"></i></button>
          </div>
        </div>
      </footer>

      <div className="modal fade" id="pullModelModal" tabIndex={-1} aria-labelledby="pullModelModalLabel" aria-hidden="true" data-bs-theme="light">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="pullModelModalLabel">Pull a model</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="pullModel" className="form-label">Model</label>
                <input type="text" className="form-control" id="pullModel" placeholder="model:tag" style={{ background: `linear-gradient(to right, ${pullProgress === 1 ? '#9f9' : '#6bf'} ${100 * pullProgress}%, transparent ${100 * pullProgress}%)` }} value={modelToPull} onChange={(ev) => setModelToPull(ev.target.value)} onKeyDown={(event) => event.key === 'Enter' && execPull()} disabled={pullProgress !== 0 && pullProgress !== 1} onFocus={() => { if (pullProgress === 1) { setModelToPull(''); setPullProgress(0); } }} />
              </div>
              <div>
                Search a model here : <a href="https://ollama.com/search" target="_blank">ollama.com/search</a>
              </div>
            </div>
            <div className="modal-footer">
              {
                pullProgress !== 0 && pullProgress !== 1
                  ?
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Downloading...</span>
                  </div>
                  : undefined
              }
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" disabled={pullProgress !== 0 && pullProgress !== 1} onClick={() => execPull()}>Pull</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
