import React from 'react'
import { View, Text, TouchableWithoutFeedback } from 'react-native'
import Dash from 'react-native-dash'
import 'intl'
import 'intl/locale-data/jsonp/en'
import styles from './styles'

const cellWidth = '100%'

function ReservationItem(props) {
  const reservations = props.constructorObject

  const getDate = date => {
    const options = { month: 'short' }
    const month = new Intl.DateTimeFormat('en-US', options).format(date.now)
    const day = date.getDate()
    const year = date.getFullYear()

    return { month, day, year }
  }

  const dateComponent = reservation => {
    if (!reservation?.createdAt) {
      return null
    }
    const { month, day, year } = getDate(new Date(reservation.createdAt))
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.dateMonth]}>{month}</Text>
        <Text style={[styles.dateDay]}>{day}</Text>
        <Text style={[styles.dateWeek]}>{year}</Text>
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={props.onPress}>
      <View style={{ marginLeft: 3 }}>
        <View
          style={{
            flexDirection: 'row',
            height: 20,
            width: cellWidth,
          }}>
          <View style={styles.dateContainer} />
          <View style={styles.dateSeparatorLine}>
            <View
              style={{
                height: 17.5,
                width: 0.5,
                backgroundColor: '#9B9B9B',
                top: 1,
              }}
            />
          </View>
          <View style={styles.contentContainer} />
        </View>

        <View style={styles.containerSingle}>
          {/*  the date block */}
          <View style={styles.dateContainer}>
            {dateComponent(reservations)}
          </View>

          {/* the line separator between the date block and the content block */}
          <View style={styles.dateSeparatorLine}>
            <View style={{ flex: 5, width: 0.5, backgroundColor: '#9B9B9B' }} />
            <View
              style={{
                margin: 7,
                borderRadius: 5,
                height: 10,
                width: 10,
                borderWidth: 1.5,
                borderColor: '#C48891',
              }}
            />
            <Dash
              style={{ flex: 6, flexDirection: 'column' }}
              dashColor="#9B9B9B"
              dashGap={8}
              dashThickness={0.5}
              dashLength={4}
            />
          </View>

          {/* the content block which include the title and body */}
          <View style={styles.contentContainer}>
            <View style={styles.contentTextContainer}>
              <View style={{ flex: 2 }}>
                <Text
                  style={[
                    styles.contentTitle,
                  ]}>{`${reservations.firstname} ${reservations.lastname}`}</Text>
              </View>
              <View style={{ flex: 4 }}>
                <Text numberOfLines={6} style={[styles.contentBody]}>
                  {reservations.detail}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* this checks for multipleMilestones Data before rendering */}
      </View>
    </TouchableWithoutFeedback>
  )
}

export default ReservationItem
