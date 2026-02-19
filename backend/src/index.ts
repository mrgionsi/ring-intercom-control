import { createApp } from './app.js';
import { config } from './config.js';

const app = await createApp();

app.listen(config.PORT, () => {
  console.log(`Backend listening on http://localhost:${config.PORT}`);
});
