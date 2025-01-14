import { CreateFeedbackDTO, Feedback } from '@src/types/feedback';
import { useMutation } from '@tanstack/react-query';

export const useFeedback = () => {
  const createFeedback = async (data: CreateFeedbackDTO): Promise<Feedback> => {
    console.log(1);

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id: '1',
          content: data.content,
          created_at: new Date().toISOString(),
        });
      }, 1000);
    });

    // const { data: feedback, error } = await supabase
    //   .from('feedbacks')
    //   .insert([data])
    //   .select()
    //   .single();

    // if (error) throw error;
    // return feedback;
  };

  return useMutation({
    mutationFn: createFeedback,
  });
};
