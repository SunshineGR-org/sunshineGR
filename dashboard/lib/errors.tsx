import { Card, Col, Grid, Text } from '@tremor/react'

export function NoOrg() {
    return (
        <div className="flex justify-center content-center items-center self-center">
            <Card className="w-1/2 content-center">
                <Text>
                    Δεν έχεις πρόσβαση στις αποφάσεις κάποιου οργανισμού. Επικοινωνήσε μαζί μας στο <a href="mailto:support@sunshinegr.org">support@sunshinegr.org</a>
                </Text>
            </Card>
        </div>
    );
}
