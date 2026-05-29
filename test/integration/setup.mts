// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import https from 'node:https';
import axios from 'axios';

// selbst-signiertes Zertifikat akzeptieren
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });
