import GoBackButton from '@/components/common/GoBackButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PartyCard from '@/components/pages/admin/Parties/PartyCard';
import ElectionVotingInfo from '@/components/pages/election/ElectionVotingInfo';
import PositionCard from '@/components/pages/election/PositionCard';
import YouAlreadyVoted from '@/components/pages/election/YouAlreadyVoted';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import axiosFetch from '@/lib/axios'
import { pollVote } from '@/types/poll';
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useNavigate, useParams } from 'react-router'

type voteState = {
    positionId: number,
    candidateId: number | undefined
}[]

const PollVote = () => {
    const { id:pollId } = useParams();
    const navigate = useNavigate();
    const [votedAlready, setVotedAlready] = useState(false)
    const [votes, setVotes] = useState<voteState>()

    const { data: election, isLoading } = useQuery({
        queryKey: ['pollVote', pollId],
        queryFn: async () => {
            const response = await axiosFetch.get(`/poll/getPollForVoting/${pollId}`)

            if(response.status === 403) {
                setVotedAlready(true)
                return
            }
            
            if(response.status >= 400) {
                toast.error(response.data.message);
                return
            }

            const poll = response.data as pollVote
            // setting up the state for voting
            setVotes([...poll.positions.map((position) => {
                return {
                    positionId: position.id,
                    candidateId: undefined,
                }   
            })])
            return poll
        },
        refetchOnWindowFocus: false
    })

    const { mutate: submitVote, isPending } = useMutation({
        mutationKey: ['submitVote'],
        mutationFn: async () => {
            if(votes?.some((vote) => vote.candidateId === undefined)) {
                toast.error("Please vote for all positions")
                return
            }
            const votesData = votes?.map(vote => ({ candidate_id: vote.candidateId}))
            const response = await axiosFetch.post(`/vote?pollId=${pollId}`, votesData)

            if(response.status >= 400) {
                toast.error(response.data.message)
                return
            }

            // if successfull redirect
            navigate(`/finishVote?pollId=${pollId}`)
            
            return response.data
        }
    })

    if(isLoading) {
        return <LoadingSpinner />
    }

    if(votedAlready) {
        return <YouAlreadyVoted pollId={pollId} />
    }

    if(!election) {
        return <Navigate to='/notfound' />
    }

    const handleVoteMultiple = (positionId: number, candidateId: number) => {
        setVotes((prevVotes) => {
            return prevVotes?.map((vote) => {
                if(vote.positionId === positionId) {
                    return {
                        ...vote,
                        candidateId: candidateId
                    }
                }

                return vote
            })
        })
    }

    const handleVoteSingle = (partyId: number) => {
        setVotes((prevVotes) => {
            return prevVotes?.map((vote, idx) => {
                if(vote.positionId === election?.positions[idx]?.id) {
                    const candidate = election?.positions[idx]?.candidates.filter((candidate) => 
                        candidate.party_id === partyId  
                    )

                    return {
                        ...vote,
                        candidateId: candidate?.[0]?.id || 0
                    }
                }

                return vote
            })
        })
    }

    const isVoted = (positionId: number, candidateId: number) => {
        if(!votes) return false // if there is no votes then return false for all

        return votes?.some((vote) => vote.positionId === positionId && vote.candidateId === candidateId)
    }

    const isVotedSingle = (partyId: number) => {
        const findCandidateById = (candidateId: number) => {
            for (const position of election?.positions) {
                const candidate = position.candidates.find(c => c.id === candidateId);
                if (candidate) return candidate;
            }
            return null;
        };

        // we only need to get one of the candidates since the vote is by parties
        const firstCandidateId = votes?.[0]?.candidateId
        const candidate = firstCandidateId ? findCandidateById(firstCandidateId) : null;

        return candidate?.party_id === partyId
    }

    return (
        <div className='min-h-[855px] bg-white'>
            <div className='pt-8'>
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0'>
                        <div className='flex items-center space-x-4'>
                            <GoBackButton to={`/elections/${6}`}>
                                Back to Election
                            </GoBackButton>
                        </div>
                    </div>
                </div>
            </div>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-4'>

                <ElectionVotingInfo title={election.title} description={election.description} start_date={election.start_date} 
                end_date={election.end_date} branch={election.branch} vote_type={election.vote_type} />

                {election.vote_type === 'multiple' ? (
                    election.positions.map((position) => (
                        <PositionCard key={position.id} position={position} handleClick={handleVoteMultiple} isVoted={isVoted} />
                    ))
                ) : (
                    <Card className='mb-8'>
                        <CardHeader>
                            <CardTitle>
                                Parties
                            </CardTitle>
                            <CardDescription>
                                This is the list of parties you will be voting for.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {election.parties.map((party: any) => (
                                    <PartyCard isVoted={isVotedSingle} handleVoteSingle={handleVoteSingle} parties={party} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Separator className="my-8" />

                <div className='flex justify-end'>
                    <Button onClick={() => submitVote()} disabled={isPending}
                    size="lg" className='bg-green-500 hover:bg-green-600 text-white'>
                        {isPending ? <LoadingSpinner /> : "Submit Vote"}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default PollVote