import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Tree, NodeApi } from 'react-arborist';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebContainer } from '@webcontainer/api';
import { supabase } from '../lib/supabase';
import { useStore } from '../store'; // zustand store (create separately)
import 'xterm/css/xterm.css';

export default function IDE() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const terminalRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [webcontainer, setWebcontainer] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  // Load lab or create new
  useEffect(() => {
    const init = async () => {
      // Boot WebContainer once
      const wc = await WebContainer.boot();
      setWebcontainer(wc);

      if (labId && labId !== 'new') {
        // Fetch existing lab from API
        const res = await fetch(`/api/labs?id=${labId}`);
        const lab = await res.json();
        // Mount files into WebContainer
        await wc.mount(lab.files);
        // Update state
        setFiles(Object.keys(lab.files).map(name => ({ name, type: 'file' })));
      } else {
        // New lab: mount default Electron template
        await wc.mount({
          'package.json': { file: { contents: JSON.stringify(defaultPackageJson, null, 2) } },
          'main.js': { file: { contents: defaultMainJs } },
          'renderer.js': { file: { contents: defaultRendererJs } },
          'index.html': { file: { contents: defaultHtml } }
        });
        setFiles(['package.json', 'main.js', 'renderer.js', 'index.html'].map(name => ({ name, type: 'file' })));
      }

      // Setup terminal
      const term = new Terminal({ theme: { background: '#1e1e1e' } });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      fitAddonRef.current = fitAddon;

      // Attach WebContainer shell
      const shell = await wc.spawn('jsh', { terminal: { cols: term.cols, rows: term.rows } });
      shell.output.pipeTo(new WritableStream({
        write(data) { term.write(data); }
      }));
      term.onData(data => shell.input.write(data));

      // Listen for preview server
      wc.on('server-ready', (port, url) => {
        setPreviewUrl(url);
      });

      // Run npm install automatically
      wc.spawn('npm', ['install']);
    };

    init();

    return () => {
      webcontainer?.teardown();
    };
  }, [labId]);

  const handleFileSave = async () => {
    if (!selectedFile || !webcontainer) return;
    await webcontainer.fs.writeFile(selectedFile, content);
    // Auto-deploy to preview
    const res = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labId, files: await webcontainer.fs.readdir('/') })
    });
  };

  const handleRun = () => {
    webcontainer.spawn('npm', ['start']);
  };

  const handlePublish = async () => {
    // Generate unique slug
    const slug = `lab-${Date.now()}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('os_labs')
      .insert({
        user_id: user.id,
        name: 'Untitled',
        slug,
        type: 'electron',
        package_json: defaultPackageJson,
        is_deployed: true,
        preview_enabled: true
      });
    if (!error) navigate(`/explore`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={handleRun} className="bg-green-600 px-3 py-1 rounded text-sm">▶ Run</button>
          <button onClick={handleFileSave} className="bg-blue-600 px-3 py-1 rounded text-sm">💾 Save</button>
          <button onClick={handlePublish} className="bg-purple-600 px-3 py-1 rounded text-sm">🚀 Publish</button>
        </div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" className="text-blue-400 text-sm underline">
            Preview ↗
          </a>
        )}
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 bg-gray-850 border-r border-gray-700 p-2">
          <Tree
            data={files}
            width={256}
            height={500}
            onSelect={(nodes) => {
              if (nodes.length) {
                setSelectedFile(nodes[0].id);
                webcontainer.fs.readFile(nodes[0].id, 'utf-8').then(setContent);
              }
            }}
          >
            {({ node, style }) => (
              <div style={style} className="cursor-pointer hover:bg-gray-700 p-1 rounded">
                📄 {node.id}
              </div>
            )}
          </Tree>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={content}
            onChange={setContent}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true
            }}
          />
        </div>

        {/* Terminal */}
        <div className="w-96 bg-black border-l border-gray-700">
          <div ref={terminalRef} className="h-full" />
        </div>
      </div>
    </div>
  );
}

// Default template files
const defaultPackageJson = {
  name: "electron-app",
  version: "1.0.0",
  main: "main.js",
  scripts: { start: "electron .", dev: "electron ." },
  dependencies: { electron: "latest" }
};

const defaultMainJs = `const { app, BrowserWindow } = require('electron');
function createWindow () {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadFile('index.html');
}
app.whenReady().then(createWindow);`;

const defaultRendererJs = `document.body.innerHTML = '<h1>Hello from Electron (WebContainer)</h1>';`;

const defaultHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Electron App</title></head><body></body></html>`;
