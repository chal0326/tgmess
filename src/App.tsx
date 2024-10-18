import React, { useState, useEffect } from 'react';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Send, LogIn } from 'lucide-react';

const API_ID = process.env.API_ID;
const API_HASH = process.env.API_HASH;

function App() {
  const [client, setClient] = useState<TelegramClient | null>(null);
  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [error, setError] = useState('');

  const initClient = async () => {
    try {
      setStatus('Initializing client...');
      setError('');
      const stringSession = new StringSession('');
      const newClient = new TelegramClient(stringSession, API_ID, API_HASH, {
        connectionRetries: 5,
      });

      await newClient.start({
        phoneNumber: async () => phoneNumber,
        password: async () => {
          setShowPasswordPrompt(true);
          return new Promise((resolve) => {
            const checkPassword = setInterval(() => {
              if (password) {
                clearInterval(checkPassword);
                resolve(password);
              }
            }, 100);
          });
        },
        phoneCode: async () => {
          return new Promise((resolve) => {
            const checkPhoneCode = setInterval(() => {
              if (phoneCode) {
                clearInterval(checkPhoneCode);
                resolve(phoneCode);
              }
            }, 100);
          });
        },
        onError: (err) => {
          console.error(err);
          setError(`Error: ${err.message}`);
          setStatus('');
        },
      });

      setClient(newClient);
      setIsLoggedIn(true);
      setStatus('Logged in successfully. Fetching groups...');

      // Fetch groups
      const dialogs = await newClient.getDialogs();
      const groupList = dialogs
        .filter((dialog) => dialog.isGroup)
        .map((dialog) => ({ id: dialog.id.toString(), title: dialog.title }));
      setGroups(groupList);
      setStatus('Ready to post');
    } catch (error) {
      console.error('Failed to initialize client:', error);
      setError(`Failed to log in: ${(error as Error).message}`);
      setStatus('');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initClient();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !message || selectedGroups.length === 0) return;

    setStatus('Sending messages...');
    setError('');
    for (const groupId of selectedGroups) {
      try {
        await client.sendMessage(groupId, { message });
      } catch (error) {
        console.error(`Failed to send message to group ${groupId}:`, error);
        setError(`Error sending to group ${groupId}: ${(error as Error).message}`);
        setStatus('');
        return;
      }
    }
    setStatus('Messages sent successfully!');
    setMessage('');
    setSelectedGroups([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Telegram Multi-Group Poster</h1>
        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            {phoneNumber && !isLoggedIn && (
              <div>
                <label htmlFor="phoneCode" className="block text-sm font-medium text-gray-700">
                  Phone Code
                </label>
                <input
                  type="text"
                  id="phoneCode"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
            )}
            {showPasswordPrompt && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Log In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Groups</label>
              <div className="mt-1 max-h-40 overflow-y-auto">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={group.id}
                      value={group.id}
                      checked={selectedGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroups([...selectedGroups, group.id]);
                        } else {
                          setSelectedGroups(selectedGroups.filter((id) => id !== group.id));
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={group.id} className="ml-2 block text-sm text-gray-900">
                      {group.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Send className="mr-2 h-5 w-5" />
              Send to Selected Groups
            </button>
          </form>
        )}
        {status && <p className="mt-4 text-sm text-green-600">{status}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default App;
