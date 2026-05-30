// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import axios from 'axios';
import https from 'node:https';

// selbst-signiertes Zertifikat akzeptieren
axios.defaults.httpsAgent = new https.Agent({ rejectUnauthorized: false });
