import { Menu, MenuItemConstructorOptions, BrowserWindow, app, dialog } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const, submenu: [] },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          },
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu-open-project');
          },
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-save-project');
          },
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-save-project-as');
          },
        },
        { type: 'separator' },
        {
          label: 'Import Media',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-media');
          },
        },
        { type: 'separator' },
        {
          label: 'Export Video',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-video');
          },
        },
        { type: 'separator' },
        ...(isMac
          ? []
          : [
              {
                label: 'Exit',
                click: () => {
                  app.quit();
                },
              } as MenuItemConstructorOptions,
            ]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow.webContents.send('menu-undo');
          },
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => {
            mainWindow.webContents.send('menu-redo');
          },
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => {
            mainWindow.webContents.send('menu-cut');
          },
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => {
            mainWindow.webContents.send('menu-copy');
          },
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => {
            mainWindow.webContents.send('menu-paste');
          },
        },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => {
            mainWindow.webContents.send('menu-delete');
          },
        },
        { type: 'separator' },
        {
          label: 'Split Clip',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            mainWindow.webContents.send('menu-split-clip');
          },
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => {
            mainWindow.webContents.send('menu-select-all');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          },
        },
        { type: 'separator' },
        {
          label: 'Zoom In Timeline',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-in');
          },
        },
        {
          label: 'Zoom Out Timeline',
          accelerator: 'CmdOrCtrl+Minus',
          click: () => {
            mainWindow.webContents.send('menu-zoom-out');
          },
        },
        {
          label: 'Fit Timeline',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('menu-fit-timeline');
          },
        },
        { type: 'separator' },
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ClipForge',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About ClipForge',
              message: 'ClipForge',
              detail:
                'Version 1.0.0\n\nA powerful desktop video editor built with Electron, React, and FFmpeg.\n\n© 2024 ClipForge',
              buttons: ['OK'],
            });
          },
        },
        {
          label: 'Documentation',
          click: () => {
            require('electron').shell.openExternal('https://github.com/your-org/clipforge/wiki');
          },
        },
        {
          label: 'Report Issue',
          click: () => {
            require('electron').shell.openExternal('https://github.com/your-org/clipforge/issues');
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}