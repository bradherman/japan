import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { CityAtmosphere } from '@/components/layout/CityAtmosphere'
import { CityProvider } from '@/lib/city-context'
import { TodayView } from '@/components/today/TodayView'
import { ItineraryView } from '@/components/itinerary/ItineraryView'
import { EatDrinkView } from '@/components/eat-drink/EatDrinkView'
import { ReservationView } from '@/components/reservations/ReservationView'
import { MoreView } from '@/components/more/MoreView'
import { TransportView } from '@/components/more/TransportView'
import { PackingView } from '@/components/more/PackingView'
import { SettingsView } from '@/components/more/SettingsView'
import { CurrencyView } from '@/components/more/CurrencyView'
import { RecommendationsView } from '@/components/more/RecommendationsView'
import { ChatSheet } from '@/components/chat/ChatSheet'

export default function App() {
  return (
    <BrowserRouter>
      <CityProvider>
        <div className="flex min-h-dvh flex-col bg-bg">
          <CityAtmosphere />
          <main className="relative z-10 flex-1">
            <Routes>
              <Route path="/" element={<ItineraryView />} />
              <Route path="/today" element={<TodayView />} />
              <Route path="/eat-drink" element={<EatDrinkView />} />
              <Route path="/reservations" element={<ReservationView />} />
              <Route path="/more" element={<MoreView />} />
              <Route path="/more/transport" element={<TransportView />} />
              <Route path="/more/packing" element={<PackingView />} />
              <Route path="/more/currency" element={<CurrencyView />} />
              <Route path="/more/recommendations" element={<RecommendationsView />} />
              <Route path="/more/settings" element={<SettingsView />} />
            </Routes>
          </main>
          <BottomNav />
          <ChatSheet />
        </div>
      </CityProvider>
    </BrowserRouter>
  )
}
