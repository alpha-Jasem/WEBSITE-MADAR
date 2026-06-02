import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'

import { LoadingScreen }  from '../components/shared/LoadingScreen'
import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor }  from '../components/shared/CustomCursor'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'

import { Navbar }        from '../components/public/Navbar'
import { Hero }          from '../components/public/Hero'
import { StickyShowcase } from '../components/public/StickyShowcase'
import { Problem }       from '../components/public/Problem'
import { ConversionOffer } from '../components/public/ConversionOffer'
import { Services }      from '../components/public/Services'
import { HowItWorks }    from '../components/public/HowItWorks'
import { CaseStudies }   from '../components/public/CaseStudies'
import { Industries }    from '../components/public/Industries'
import { LeadForm }      from '../components/public/LeadForm'

import { FinalCTA }      from '../components/public/FinalCTA'
import { Footer }        from '../components/public/Footer'

export const HomePage = () => {
  const [loading, setLoading] = useState(true)
  const handleDone = useCallback(() => setLoading(false), [])

  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <AnimatePresence>
        {loading && <LoadingScreen onDone={handleDone} />}
      </AnimatePresence>

      {!loading && (
        <>
          <CustomCursor />
          <ScrollProgress />
          <Navbar />
          <main>
            <Hero />
            <StickyShowcase />
            <Problem />
            <ConversionOffer />
            <Services />
            <HowItWorks />
            <CaseStudies />
            <Industries />
            <LeadForm />
            <FinalCTA />
          </main>
          <Footer />
          <WhatsAppButton />
          <MadarAgentWidget agentType="sales_website" pageTitle="موقع مدار" />
        </>
      )}
    </div>
  )
}
