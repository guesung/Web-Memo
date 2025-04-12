-- Add memo_count column to memo.category table
ALTER TABLE memo.category ADD COLUMN memo_count INTEGER DEFAULT 0;

-- Update existing memo counts
UPDATE memo.category
SET memo_count = (
    SELECT COUNT(*)
    FROM memo.memo
    WHERE memo.category_id = memo.category.id
);

-- Create function to update memo count
CREATE OR REPLACE FUNCTION update_category_memo_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.category_id IS NOT NULL THEN
            UPDATE memo.category
            SET memo_count = memo_count + 1
            WHERE id = NEW.category_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
            IF OLD.category_id IS NOT NULL THEN
                UPDATE memo.category
                SET memo_count = memo_count - 1
                WHERE id = OLD.category_id;
            END IF;
            IF NEW.category_id IS NOT NULL THEN
                UPDATE memo.category
                SET memo_count = memo_count + 1
                WHERE id = NEW.category_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.category_id IS NOT NULL THEN
            UPDATE memo.category
            SET memo_count = memo_count - 1
            WHERE id = OLD.category_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for memo count updates
DROP TRIGGER IF EXISTS update_category_memo_count_trigger ON memo.memo;
CREATE TRIGGER update_category_memo_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON memo.memo
    FOR EACH ROW
    EXECUTE FUNCTION update_category_memo_count();