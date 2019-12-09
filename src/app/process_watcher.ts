import {getMetadata, getUserMetadata} from 'root/api/overlay';
import {WindowLocator} from 'root/app/locatewindow';
import {sendMessageToHomeWindow, sendMessageToOverlayWindow} from 'root/app/messages';
import {createOverlayWindow, getOverlayWindow, withOverlayWindow} from 'root/app/overlay_window';
import {settingsStore} from 'root/app/settings_store';
import {ProcessWatcher} from 'root/app/watchprocess';
import {error} from 'root/lib/logger';

let MTGApid = -1;
const movementSensitivity = 5;

const overlayPositioner = new WindowLocator();
const processWatcher = new ProcessWatcher('MTGA.exe');

export let gameIsRunning = false;

export function setupProcessWatcher(): () => void {
  const processWatcherFn = () => {
    processWatcher
      .getprocesses()
      .then(res => {
        //console.log(res);
        MTGApid = res;
        overlayPositioner.findmtga(MTGApid);
        if (res === -1) {
          gameIsRunning = false;
          sendMessageToHomeWindow('show-status', {message: 'Game is not running!', color: '#dbb63d'});
          withOverlayWindow(w => w.hide());
        } else if (res !== -1) {
          gameIsRunning = true;
          let overlayWindow = getOverlayWindow();
          if (!overlayWindow) {
            overlayWindow = createOverlayWindow();
            const account = settingsStore.getAccount();
            if (account) {
              getMetadata()
                .then(md => sendMessageToOverlayWindow('set-metadata', md))
                .catch(err => {
                  error('Failure to load Metadata', err);
                });
              getUserMetadata(+account.uid)
                .then(umd => sendMessageToOverlayWindow('set-userdata', umd))
                .catch(err => {
                  error('Failure to load User Metadata', err);
                });
            }
          }
          if (settingsStore.get().overlay) {
            if (
              overlayPositioner.bounds.width !== 0 &&
              (Math.abs(overlayWindow.getBounds().x - overlayPositioner.bounds.x) > movementSensitivity ||
                Math.abs(overlayWindow.getBounds().y - overlayPositioner.bounds.y) > movementSensitivity ||
                Math.abs(overlayWindow.getBounds().width - overlayPositioner.bounds.width) > movementSensitivity ||
                Math.abs(overlayWindow.getBounds().height - overlayPositioner.bounds.height) > movementSensitivity)
            ) {
              if (!overlayWindow.isVisible()) {
                overlayWindow.show();
              }
              overlayWindow.setBounds(overlayPositioner.bounds);
            } else if (overlayPositioner.bounds.width === 0) {
              overlayWindow.hide();
            } else {
              if (!overlayWindow.isVisible()) {
                overlayWindow.show();
              }
            }
          }
        }
      })
      .catch(_ => {});
  };

  return processWatcherFn;
}
