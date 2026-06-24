import { ZapIcon } from 'lucide-react'
import React from 'react'

const RateLimitUI = () => {
  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
        <div className='bg-primary/10 border border-primary/30 rounded-lg shadow-md'>
            <div className='flex flex-col md:flex-row items-center p-6'>
                <div className='shrink-0 bg-primary/20 p-4 rounded-full mb-4 md:mb-0 md:mr-6'>
                    <ZapIcon className='size-10 text-primary'/>
                </div>
                <div className='flex-1 text-center md:text-left'>
                    <h3 className='text-xl font-bold font-mono tracking-wider mb-2'>Rate Limit Reached</h3>
                    <p className='text-base-content mb-1 font-mono tracking-wide'>
                        You've made too many requests in a short period. Please wait for a moment.
                    </p>
                    <p className='text-sm text-base-content/70 tracking-wide font-mono'>
                        Try again in a few seconds for the best experience.
                    </p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default RateLimitUI