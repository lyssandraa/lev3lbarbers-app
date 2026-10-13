# LEV3L Barbers — Mobile App

The iOS and Android app for **LEV3L Barbers**, a working barbershop. Customers use it to book, collect loyalty stamps, shop and play mini-games for weekly prizes. Staff use it to stamp loyalty cards and run the shop from their phone.

Part of a three-part system I designed and built end to end:

| Part | Stack | Repo |
| --- | --- | --- |
| Mobile app (iOS + Android) | React Native, Expo | this repo |
| Website + admin dashboard | React, Vite | [lev3lbarbers](https://github.com/lyssandraa/lev3lbarbers) |
| REST API | Node.js, Express, Prisma, PostgreSQL | private (production backend) |

## Features

**Customers**
- Book appointments with a chosen barber based on live availability
- Digital loyalty card with a personal QR code; stamps unlock rewards
- Shop and gift cards with **Stripe** payments
- "What's On" news feed, gallery, services menu and contact page
- Push notifications
- Mini-games: **Snake** with a weekly prize leaderboard, and real-time multiplayer **Pong** over WebSockets with friend invites

**Staff**
- QR scanner to add stamps to a customer's card in person
- Quick staff switching with PIN login on a shared shop device
- Full admin panel, matching the website: bookings, barbers, services, promos, loyalty and reward settings, gift cards, orders, newsletter and more

## Tech

- **Expo SDK 54 / React Native 0.81 / React 19**
- React Navigation (bottom tabs + native stack)
- Stripe React Native SDK, Expo Camera (QR scanning), Expo Notifications
- WebSockets for live multiplayer
- **EAS Build** and **EAS Update** for store builds and over-the-air updates

## Running locally

```bash
npm install
npx expo start
```

The app talks to the production API by default (see `src/config`). Some native modules (Stripe, camera) need a development build rather than Expo Go:

```bash
npx expo run:ios      # or run:android
```
